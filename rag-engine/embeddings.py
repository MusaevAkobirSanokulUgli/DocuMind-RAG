"""Embedding generation using sentence-transformers."""

from __future__ import annotations

import logging
from typing import Union

import numpy as np
from sentence_transformers import SentenceTransformer

import config

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    """Get or lazily load the sentence-transformers model.

    The model is loaded once and cached in module-level state for reuse
    across requests.

    Returns:
        A loaded SentenceTransformer model.
    """
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", config.EMBEDDING_MODEL)
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
        logger.info("Embedding model loaded. Dimension: %d", _model.get_sentence_embedding_dimension())
    return _model


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Generate embeddings for a list of texts.

    Args:
        texts: List of text strings to embed.
        batch_size: Number of texts to process at once.

    Returns:
        List of embedding vectors, each as a list of floats.
    """
    if not texts:
        return []

    model = get_model()
    logger.info("Generating embeddings for %d texts (batch_size=%d)", len(texts), batch_size)

    embeddings: np.ndarray = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 100,
        normalize_embeddings=True,
    )

    result = embeddings.tolist()
    logger.info("Generated %d embeddings of dimension %d", len(result), len(result[0]) if result else 0)
    return result


def embed_query(query: str) -> list[float]:
    """Generate embedding for a single query string.

    Args:
        query: The query text to embed.

    Returns:
        Embedding vector as a list of floats.
    """
    model = get_model()
    embedding: np.ndarray = model.encode(
        query,
        normalize_embeddings=True,
    )
    return embedding.tolist()


def get_embedding_dimension() -> int:
    """Return the dimensionality of the embedding model."""
    model = get_model()
    return model.get_sentence_embedding_dimension()
