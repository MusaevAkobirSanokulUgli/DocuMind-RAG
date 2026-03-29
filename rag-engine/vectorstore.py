"""ChromaDB vector store operations."""

from __future__ import annotations

import logging
from typing import Optional

import chromadb
from chromadb.config import Settings

import config

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None


def get_client() -> chromadb.ClientAPI:
    """Get or create the persistent ChromaDB client."""
    global _client
    if _client is None:
        logger.info("Initializing ChromaDB client at: %s", config.CHROMA_PERSIST_DIR)
        _client = chromadb.PersistentClient(
            path=config.CHROMA_PERSIST_DIR,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )
        logger.info("ChromaDB client initialized")
    return _client


def get_or_create_collection(name: str = config.COLLECTION_NAME) -> chromadb.Collection:
    """Get an existing collection or create a new one.

    Args:
        name: Name of the collection.

    Returns:
        A ChromaDB Collection object.
    """
    client = get_client()
    collection = client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info("Collection '%s' ready (count=%d)", name, collection.count())
    return collection


def add_chunks(
    document_id: str,
    chunk_contents: list[str],
    chunk_embeddings: list[list[float]],
    chunk_metadatas: list[dict],
    collection_name: str = config.COLLECTION_NAME,
) -> int:
    """Add document chunks with embeddings to the vector store.

    Args:
        document_id: The parent document's ID.
        chunk_contents: List of chunk text content.
        chunk_embeddings: Pre-computed embeddings for each chunk.
        chunk_metadatas: Metadata dicts for each chunk.
        collection_name: Target collection name.

    Returns:
        Number of chunks added.
    """
    if not chunk_contents:
        return 0

    collection = get_or_create_collection(collection_name)

    ids = [f"{document_id}_chunk_{i}" for i in range(len(chunk_contents))]

    for meta in chunk_metadatas:
        meta["document_id"] = document_id

    batch_size = 500
    total_added = 0
    for start in range(0, len(ids), batch_size):
        end = min(start + batch_size, len(ids))
        collection.add(
            ids=ids[start:end],
            documents=chunk_contents[start:end],
            embeddings=chunk_embeddings[start:end],
            metadatas=chunk_metadatas[start:end],
        )
        total_added += end - start
        logger.info("Added batch %d-%d to collection '%s'", start, end, collection_name)

    logger.info("Added %d chunks for document '%s' to collection '%s'",
                 total_added, document_id, collection_name)
    return total_added


def query_collection(
    query_embedding: list[float],
    top_k: int = 5,
    document_ids: Optional[list[str]] = None,
    collection_name: str = config.COLLECTION_NAME,
) -> dict:
    """Query the vector store for similar chunks.

    Args:
        query_embedding: The query embedding vector.
        top_k: Number of results to return.
        document_ids: Optional list of document IDs to filter by.
        collection_name: Collection to search in.

    Returns:
        ChromaDB query results dict with ids, documents, metadatas, distances.
    """
    collection = get_or_create_collection(collection_name)

    if collection.count() == 0:
        logger.warning("Collection '%s' is empty", collection_name)
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    where_filter = None
    if document_ids:
        if len(document_ids) == 1:
            where_filter = {"document_id": {"$eq": document_ids[0]}}
        else:
            where_filter = {"document_id": {"$in": document_ids}}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    logger.info("Query returned %d results from collection '%s'",
                 len(results["ids"][0]) if results["ids"] else 0, collection_name)
    return results


def get_chunks_by_document(
    document_id: str,
    collection_name: str = config.COLLECTION_NAME,
) -> dict:
    """Get all chunks for a specific document.

    Args:
        document_id: The document ID to retrieve chunks for.
        collection_name: Collection to search in.

    Returns:
        ChromaDB get results dict.
    """
    collection = get_or_create_collection(collection_name)
    results = collection.get(
        where={"document_id": {"$eq": document_id}},
        include=["documents", "metadatas"],
    )
    return results


def delete_document_chunks(
    document_id: str,
    collection_name: str = config.COLLECTION_NAME,
) -> int:
    """Delete all chunks for a document from the vector store.

    Args:
        document_id: The document ID whose chunks should be removed.
        collection_name: Collection to delete from.

    Returns:
        Number of chunks deleted.
    """
    collection = get_or_create_collection(collection_name)
    existing = collection.get(
        where={"document_id": {"$eq": document_id}},
    )
    count = len(existing["ids"])
    if count > 0:
        collection.delete(ids=existing["ids"])
        logger.info("Deleted %d chunks for document '%s'", count, document_id)
    return count


def delete_collection(collection_name: str) -> None:
    """Delete an entire collection.

    Args:
        collection_name: Name of the collection to delete.
    """
    client = get_client()
    client.delete_collection(collection_name)
    logger.info("Deleted collection '%s'", collection_name)


def list_collections() -> list[dict]:
    """List all collections with their metadata.

    Returns:
        List of dicts with name, count, and metadata for each collection.
    """
    client = get_client()
    collections = client.list_collections()
    result = []
    for col in collections:
        collection = client.get_collection(col.name)
        result.append({
            "name": col.name,
            "count": collection.count(),
            "metadata": col.metadata or {},
        })
    return result


def get_total_chunk_count() -> int:
    """Get the total number of chunks across all collections."""
    total = 0
    client = get_client()
    for col in client.list_collections():
        collection = client.get_collection(col.name)
        total += collection.count()
    return total
