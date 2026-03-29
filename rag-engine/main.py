"""FastAPI main application for the DocuMind RAG Engine."""

from __future__ import annotations

import logging
import os
import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

import config
from models import (
    ProcessRequest,
    ProcessResponse,
    QueryRequest,
    QueryResponse,
    CollectionInfo,
    DeleteResponse,
    HealthResponse,
    ChunkInfo,
)
from document_loaders import load_document
from text_splitter import RecursiveTextSplitter
from embeddings import embed_texts, embed_query, get_model, get_embedding_dimension
import vectorstore as vs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DocuMind RAG Engine",
    description="Retrieval-Augmented Generation engine for intelligent document Q&A",
    version="1.0.0",
)

_allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3100,http://localhost:5100,http://localhost:8081").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    """Pre-load the embedding model on startup."""
    logger.info("Starting RAG Engine...")
    logger.info("Embedding model: %s", config.EMBEDDING_MODEL)
    logger.info("ChromaDB dir: %s", config.CHROMA_PERSIST_DIR)
    get_model()
    vs.get_client()
    logger.info("RAG Engine ready")


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        embedding_model=config.EMBEDDING_MODEL,
        chroma_dir=config.CHROMA_PERSIST_DIR,
        total_chunks=vs.get_total_chunk_count(),
    )


@app.post("/process", response_model=ProcessResponse)
async def process_document(request: ProcessRequest) -> ProcessResponse:
    """Process an uploaded document: extract text, chunk, embed, store.

    This is the full document ingestion pipeline.
    """
    logger.info("Processing document: %s (id=%s)", request.file_name, request.document_id)

    try:
        text = load_document(request.file_path)
        if not text.strip():
            return ProcessResponse(
                document_id=request.document_id,
                num_chunks=0,
                collection_name=config.COLLECTION_NAME,
                status="warning",
                message="Document appears to be empty or unreadable",
            )

        splitter = RecursiveTextSplitter(
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
        )
        chunks = splitter.split(text)
        logger.info("Split into %d chunks", len(chunks))

        if not chunks:
            return ProcessResponse(
                document_id=request.document_id,
                num_chunks=0,
                collection_name=config.COLLECTION_NAME,
                status="warning",
                message="No chunks generated from document",
            )

        chunk_texts = [c.content for c in chunks]
        chunk_embeddings = embed_texts(chunk_texts)

        chunk_metadatas = [
            {
                "file_name": request.file_name,
                "chunk_index": c.chunk_index,
                "start_char": c.start_char,
                "end_char": c.end_char,
                "chunk_length": c.length,
            }
            for c in chunks
        ]

        num_added = vs.add_chunks(
            document_id=request.document_id,
            chunk_contents=chunk_texts,
            chunk_embeddings=chunk_embeddings,
            chunk_metadatas=chunk_metadatas,
        )

        return ProcessResponse(
            document_id=request.document_id,
            num_chunks=num_added,
            collection_name=config.COLLECTION_NAME,
            status="success",
            message=f"Successfully processed {request.file_name}: {num_added} chunks created",
        )

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Error processing document %s", request.document_id)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(exc)}")


@app.post("/upload-and-process", response_model=ProcessResponse)
async def upload_and_process(
    file: UploadFile = File(...),
    document_id: str = Form(default=""),
    chunk_size: int = Form(default=512),
    chunk_overlap: int = Form(default=50),
) -> ProcessResponse:
    """Upload a file directly to the RAG engine and process it.

    Alternative to the two-step upload-then-process flow.
    """
    if not document_id:
        document_id = str(uuid.uuid4())

    file_ext = Path(file.filename or "unknown.txt").suffix
    save_path = Path(config.UPLOAD_DIR) / f"{document_id}{file_ext}"

    try:
        with open(save_path, "wb") as f:
            content = await file.read()
            f.write(content)

        request = ProcessRequest(
            document_id=document_id,
            file_path=str(save_path),
            file_name=file.filename or "unknown",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        return await process_document(request)

    except Exception as exc:
        if save_path.exists():
            save_path.unlink()
        logger.exception("Upload and process failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest) -> QueryResponse:
    """Execute a RAG query: embed question, retrieve chunks, build context."""
    from retriever import retrieve_and_build_context

    logger.info("Query: '%s' (top_k=%d)", request.question[:80], request.top_k)

    try:
        response = retrieve_and_build_context(
            question=request.question,
            top_k=request.top_k,
            document_ids=request.document_ids,
            score_threshold=request.score_threshold,
        )
        return response

    except Exception as exc:
        logger.exception("Query failed")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(exc)}")


@app.get("/collections", response_model=list[CollectionInfo])
async def list_collections() -> list[CollectionInfo]:
    """List all vector store collections."""
    collections = vs.list_collections()
    return [CollectionInfo(**c) for c in collections]


@app.get("/chunks/{document_id}", response_model=list[ChunkInfo])
async def get_document_chunks(document_id: str) -> list[ChunkInfo]:
    """Get all chunks for a specific document."""
    results = vs.get_chunks_by_document(document_id)

    chunks: list[ChunkInfo] = []
    if results["ids"]:
        for i, chunk_id in enumerate(results["ids"]):
            metadata = results["metadatas"][i] if results["metadatas"] else {}
            content = results["documents"][i] if results["documents"] else ""
            chunks.append(ChunkInfo(
                chunk_id=chunk_id,
                document_id=metadata.get("document_id", document_id),
                content=content,
                chunk_index=metadata.get("chunk_index", i),
                start_char=metadata.get("start_char", 0),
                end_char=metadata.get("end_char", 0),
                metadata=metadata,
            ))

    chunks.sort(key=lambda c: c.chunk_index)
    return chunks


@app.delete("/chunks/{document_id}", response_model=DeleteResponse)
async def delete_document_chunks(document_id: str) -> DeleteResponse:
    """Delete all chunks for a document."""
    count = vs.delete_document_chunks(document_id)
    return DeleteResponse(
        status="success",
        message=f"Deleted {count} chunks for document {document_id}",
    )


@app.delete("/collection/{name}", response_model=DeleteResponse)
async def delete_collection(name: str) -> DeleteResponse:
    """Delete an entire collection."""
    try:
        vs.delete_collection(name)
        return DeleteResponse(
            status="success",
            message=f"Collection '{name}' deleted",
        )
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Collection not found: {str(exc)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
        log_level="info",
    )
