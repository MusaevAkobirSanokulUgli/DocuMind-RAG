"""Retrieval pipeline: embed query, vector search, rerank, assemble context."""

from __future__ import annotations

import logging
from typing import Optional

import embeddings as emb
import vectorstore as vs
import llm
from models import SourceDocument, QueryResponse

logger = logging.getLogger(__name__)

RAG_PROMPT_TEMPLATE = """You are DocuMind, an intelligent document assistant. Answer the user's question using ONLY the provided context. If the context does not contain enough information to answer, say so honestly.

Rules:
1. Base your answer strictly on the provided context.
2. Cite sources using [Source N] notation for each fact.
3. If multiple sources support a point, cite all of them.
4. If the context doesn't cover the question, state that clearly.
5. Be concise but thorough.

Context:
{context}

Question: {question}

Answer:"""


def retrieve_and_build_context(
    question: str,
    top_k: int = 5,
    document_ids: Optional[list[str]] = None,
    score_threshold: float = 0.0,
) -> QueryResponse:
    """Execute the full retrieval pipeline.

    Steps:
    1. Embed the user's question.
    2. Perform vector similarity search in ChromaDB.
    3. Rerank results by relevance score.
    4. Assemble context string with source citations.
    5. Build the final LLM prompt.

    Args:
        question: The user's natural language question.
        top_k: Maximum number of chunks to retrieve.
        document_ids: Optional filter to specific documents.
        score_threshold: Minimum similarity score (0-1, cosine distance inverted).

    Returns:
        QueryResponse with context, sources, and prompt.
    """
    logger.info("Retrieval pipeline started for: '%s' (top_k=%d)", question[:80], top_k)

    query_embedding = emb.embed_query(question)
    logger.info("Query embedded (dim=%d)", len(query_embedding))

    raw_results = vs.query_collection(
        query_embedding=query_embedding,
        top_k=top_k * 2,
        document_ids=document_ids,
    )

    sources = _parse_results(raw_results)
    logger.info("Vector search returned %d raw results", len(sources))

    sources = _rerank(sources, score_threshold)
    sources = sources[:top_k]
    logger.info("After reranking and filtering: %d results", len(sources))

    context = _assemble_context(sources)
    prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=question)

    answer = ""
    if sources:
        llm_answer = llm.generate_answer(prompt)
        if llm_answer:
            answer = llm_answer
            logger.info("LLM answer generated for query")

    return QueryResponse(
        question=question,
        context=context,
        sources=sources,
        num_results=len(sources),
        prompt=prompt,
        answer=answer,
    )


def _parse_results(raw: dict) -> list[SourceDocument]:
    """Parse ChromaDB query results into SourceDocument objects."""
    sources: list[SourceDocument] = []

    if not raw["ids"] or not raw["ids"][0]:
        return sources

    ids = raw["ids"][0]
    documents = raw["documents"][0] if raw["documents"] else [""] * len(ids)
    metadatas = raw["metadatas"][0] if raw["metadatas"] else [{}] * len(ids)
    distances = raw["distances"][0] if raw["distances"] else [1.0] * len(ids)

    for chunk_id, content, metadata, distance in zip(ids, documents, metadatas, distances):
        score = max(0.0, 1.0 - distance)

        sources.append(SourceDocument(
            chunk_id=chunk_id,
            document_id=metadata.get("document_id", ""),
            content=content or "",
            score=round(score, 4),
            chunk_index=metadata.get("chunk_index", 0),
            file_name=metadata.get("file_name", ""),
            metadata=metadata,
        ))

    return sources


def _rerank(sources: list[SourceDocument], score_threshold: float) -> list[SourceDocument]:
    """Rerank results by score and apply threshold filtering.

    For a production system, this would use a cross-encoder reranker like
    `cross-encoder/ms-marco-MiniLM-L-6-v2`. Here we use the cosine similarity
    scores from the initial retrieval, apply length-based penalties for very
    short chunks, and filter by threshold.
    """
    for source in sources:
        content_len = len(source.content.strip())
        if content_len < 50:
            source.score *= 0.7
        elif content_len < 100:
            source.score *= 0.85

    filtered = [s for s in sources if s.score >= score_threshold]
    filtered.sort(key=lambda s: s.score, reverse=True)

    seen_contents: set[str] = set()
    deduplicated: list[SourceDocument] = []
    for source in filtered:
        content_key = source.content[:200].strip().lower()
        if content_key not in seen_contents:
            seen_contents.add(content_key)
            deduplicated.append(source)

    return deduplicated


def _assemble_context(sources: list[SourceDocument]) -> str:
    """Assemble retrieved chunks into a formatted context string."""
    if not sources:
        return "No relevant context found."

    parts: list[str] = []
    for i, source in enumerate(sources, 1):
        header = f"[Source {i}] (File: {source.file_name}, Chunk {source.chunk_index}, Score: {source.score:.2f})"
        parts.append(f"{header}\n{source.content.strip()}")

    return "\n\n---\n\n".join(parts)
