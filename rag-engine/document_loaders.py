"""Document loaders for PDF, DOCX, TXT, and MD files."""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def load_document(file_path: str) -> str:
    """Load a document and return its text content.

    Supports PDF, DOCX, TXT, and MD files.

    Args:
        file_path: Path to the document file.

    Returns:
        Extracted text content as a string.

    Raises:
        ValueError: If file type is unsupported.
        FileNotFoundError: If file does not exist.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    suffix = path.suffix.lower()
    loader_map = {
        ".pdf": _load_pdf,
        ".docx": _load_docx,
        ".txt": _load_text,
        ".md": _load_text,
    }

    loader = loader_map.get(suffix)
    if loader is None:
        raise ValueError(f"Unsupported file type: {suffix}. Supported: {list(loader_map.keys())}")

    text = loader(file_path)
    logger.info("Loaded %s (%d characters)", path.name, len(text))
    return text


def _load_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyPDF2."""
    from PyPDF2 import PdfReader

    reader = PdfReader(file_path)
    pages: list[str] = []
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            pages.append(f"[Page {i + 1}]\n{page_text.strip()}")
    return "\n\n".join(pages)


def _load_docx(file_path: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    from docx import Document

    doc = Document(file_path)
    paragraphs: list[str] = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append(text)
    return "\n\n".join(paragraphs)


def _load_text(file_path: str) -> str:
    """Read plain text or markdown files."""
    path = Path(file_path)
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
    for encoding in encodings:
        try:
            return path.read_text(encoding=encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return path.read_text(encoding="utf-8", errors="replace")
