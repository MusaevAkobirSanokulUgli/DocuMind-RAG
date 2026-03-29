"""Pydantic models for request/response schemas."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class ProcessRequest(BaseModel):
    """Request to process an uploaded document."""
    document_id: str = Field(..., description="Unique document identifier from the backend")
    file_path: str = Field(..., description="Path to the uploaded file on disk")
    file_name: str = Field(..., description="Original file name")
    chunk_size: int = Field(default=512, ge=64, le=4096, description="Characters per chunk")
    chunk_overlap: int = Field(default=50, ge=0, le=512, description="Overlap between chunks")


class ProcessResponse(BaseModel):
    """Response after processing a document."""
    document_id: str
    num_chunks: int
    collection_name: str
    status: str = "success"
    message: str = ""


class ChunkInfo(BaseModel):
    """Information about a single document chunk."""
    chunk_id: str
    document_id: str
    content: str
    chunk_index: int
    start_char: int
    end_char: int
    metadata: dict = Field(default_factory=dict)


class QueryRequest(BaseModel):
    """Request for RAG query."""
    question: str = Field(..., min_length=1, description="User question")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to retrieve")
    document_ids: Optional[list[str]] = Field(default=None, description="Limit search to specific docs")
    score_threshold: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum similarity score")


class SourceDocument(BaseModel):
    """A source document chunk returned from retrieval."""
    chunk_id: str
    document_id: str
    content: str
    score: float
    chunk_index: int
    file_name: str = ""
    metadata: dict = Field(default_factory=dict)


class QueryResponse(BaseModel):
    """Response from a RAG query with retrieved context."""
    question: str
    context: str
    sources: list[SourceDocument]
    num_results: int
    prompt: str = ""
    answer: str = ""


class CollectionInfo(BaseModel):
    """Info about a ChromaDB collection."""
    name: str
    count: int
    metadata: dict = Field(default_factory=dict)


class DeleteResponse(BaseModel):
    """Response after deleting a collection or document chunks."""
    status: str = "success"
    message: str = ""


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    embedding_model: str = ""
    chroma_dir: str = ""
    total_chunks: int = 0
