"""Recursive character text splitter for document chunking."""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

DEFAULT_SEPARATORS: list[str] = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]


@dataclass
class TextChunk:
    """Represents a chunk of text with positional metadata."""
    content: str
    chunk_index: int
    start_char: int
    end_char: int

    @property
    def length(self) -> int:
        return len(self.content)


class RecursiveTextSplitter:
    """Splits text into overlapping chunks using a hierarchy of separators.

    The splitter tries each separator in order, splitting on the first one that
    produces sub-strings short enough to fit within `chunk_size`. If no separator
    works, it falls back to character-level splitting.
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        separators: list[str] | None = None,
    ) -> None:
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be less than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or DEFAULT_SEPARATORS

    def split(self, text: str) -> list[TextChunk]:
        """Split text into chunks with overlap.

        Args:
            text: The full document text to split.

        Returns:
            List of TextChunk objects with positional metadata.
        """
        if not text or not text.strip():
            return []

        raw_chunks = self._recursive_split(text, self.separators)
        merged = self._merge_chunks(raw_chunks)

        chunks: list[TextChunk] = []
        search_start = 0
        for idx, content in enumerate(merged):
            start = text.find(content[:80], search_start)
            if start == -1:
                start = search_start
            end = start + len(content)
            chunks.append(TextChunk(
                content=content,
                chunk_index=idx,
                start_char=start,
                end_char=end,
            ))
            overlap_offset = max(0, len(content) - self.chunk_overlap)
            search_start = start + overlap_offset

        logger.info("Split text (%d chars) into %d chunks (size=%d, overlap=%d)",
                     len(text), len(chunks), self.chunk_size, self.chunk_overlap)
        return chunks

    def _recursive_split(self, text: str, separators: list[str]) -> list[str]:
        """Recursively split text using the separator hierarchy."""
        if len(text) <= self.chunk_size:
            return [text.strip()] if text.strip() else []

        for i, sep in enumerate(separators):
            if sep == "":
                return self._split_by_chars(text)
            parts = text.split(sep)
            if len(parts) <= 1:
                continue

            results: list[str] = []
            current = ""
            for part in parts:
                candidate = current + sep + part if current else part
                if len(candidate) <= self.chunk_size:
                    current = candidate
                else:
                    if current.strip():
                        if len(current) <= self.chunk_size:
                            results.append(current.strip())
                        else:
                            results.extend(self._recursive_split(current, separators[i + 1:]))
                    current = part

            if current.strip():
                if len(current) <= self.chunk_size:
                    results.append(current.strip())
                else:
                    results.extend(self._recursive_split(current, separators[i + 1:]))

            if results:
                return results

        return self._split_by_chars(text)

    def _split_by_chars(self, text: str) -> list[str]:
        """Last-resort character-level splitting."""
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start += self.chunk_size - self.chunk_overlap
        return chunks

    def _merge_chunks(self, chunks: list[str]) -> list[str]:
        """Merge small chunks together to approach target chunk_size.

        Also adds overlap from the end of the previous chunk to the beginning
        of the next chunk.
        """
        if not chunks:
            return []

        merged: list[str] = []
        current = chunks[0]

        for i in range(1, len(chunks)):
            candidate = current + " " + chunks[i]
            if len(candidate) <= self.chunk_size:
                current = candidate
            else:
                merged.append(current.strip())
                if self.chunk_overlap > 0 and len(current) > self.chunk_overlap:
                    overlap_text = current[-self.chunk_overlap:]
                    last_space = overlap_text.rfind(" ")
                    if last_space > 0:
                        overlap_text = overlap_text[last_space + 1:]
                    current = overlap_text + " " + chunks[i]
                else:
                    current = chunks[i]

        if current.strip():
            merged.append(current.strip())

        return merged
