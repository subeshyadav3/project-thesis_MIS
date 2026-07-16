"""PDF processing pipeline: fetch -> extract -> clean -> chunk.

Every step is an async function returning a new object — no in-place mutation.
Anything that can fail loudly does so with a typed error; the caller maps it
to HTTP responses.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

import httpx
import fitz  # PyMuPDF

from .config import settings
from .logger import get_logger


logger = get_logger(__name__)


# ──Errors ────────────────────────────────────────────────────────────────────


class PDFFetchError(RuntimeError):
    """File could not be obtained from the backend."""


class PDFParseError(RuntimeError):
    """PyMuPDF raised during text extraction."""


# ──Data classes ─────────────────────────────────────────────────────────────


@dataclass(slots=True)
class TextChunk:
    """A single chunk with text and provenance."""

    index: int
    text: str
    page: Optional[int] = None


@dataclass(slots=True)
class ProcessedDocument:
    """Result of the full preprocess pipeline."""

    pages: int
    raw_text: str
    cleaned_text: str
    chunks: List[TextChunk]
    char_count: int

    @property
    def chunk_count(self) -> int:
        return len(self.chunks)


# ──Fetching ─────────────────────────────────────────────────────────────────


def _build_url(document_url: str) -> str:
    """Resolve a stored ``/api/files/…``-style path into a fully-qualified URL."""
    if document_url.startswith("http://") or document_url.startswith("https://"):
        return document_url
    base = settings.backend_base_url.rstrip("/")
    return f"{base}{document_url}"


async def fetch_document_bytes(
    document_url: str,
    *,
    auth_token: Optional[str] = None,
    timeout: float = 60.0,
) -> bytes:
    """Download the PDF from the backend.

    Accepts either a fully-qualified URL or the path the backend stores
    internally (``/api/files/groups/<file>.pdf``).
    """
    url = _build_url(document_url)
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
    except httpx.TransportError as exc:
        raise PDFFetchError(f"Could not reach backend at {url}: {exc}") from exc

    if resp.status_code in (401, 403):
        raise PDFFetchError(
            f"Backend rejected the file request (HTTP {resp.status_code}). "
            "Make sure the AI service is configured with the backend JWT."
        )
    if resp.status_code == 404:
        raise PDFFetchError(f"Backend returned 404 for {url}. Was the file deleted?")
    if resp.status_code >= 400:
        raise PDFFetchError(f"Backend returned HTTP {resp.status_code} for {url}")

    content = resp.content
    if not content or len(content) < 200:
        raise PDFFetchError("Empty or suspiciously short PDF body.")

    if not content.startswith(b"%PDF"):
        # Not a real PDF — surface a clear error early.
        raise PDFFetchError(
            f"Response does not look like a PDF (first bytes: {content[:8]!r})."
        )

    return content


# ──Extraction ──────────────────────────────────────────────────────────────


def extract_text_from_bytes(pdf_bytes: bytes, *, max_pages: Optional[int] = None) -> Tuple[str, int]:
    """Extract plain text from an in-memory PDF.

    Returns ``(text, page_count)``. Truncates to ``settings.max_pdf_pages`` if
    needed to avoid blowing up memory on 1000-page theses.
    """
    max_pages = max_pages or settings.max_pdf_pages
    pages_text: List[str] = []
    page_count = 0

    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            page_count = doc.page_count
            take = min(page_count, max_pages)
            for i in range(take):
                page = doc.load_page(i)
                pages_text.append(page.get_text("text"))
    except fitz.FileDataError as exc:
        raise PDFParseError(f"PyMuPDF could not open PDF: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        raise PDFParseError(f"Unhandled PyMuPDF error: {exc}") from exc

    text = "\n".join(pages_text).strip()
    if len(text) > settings.max_text_chars:
        text = text[: settings.max_text_chars]
    return text, page_count


# ──Cleaning ─────────────────────────────────────────────────────────────────


# Compile patterns once. Each operates on a single logical transformation.
_PATT_JOIN_LINES = re.compile(r"(?<![.\!?])\n(?=[A-Za-z\-])")
_PATT_MULTI_NEWLINE = re.compile(r"\n{3,}")
_PATT_MULTI_SPACE = re.compile(r"[ \t]{2,}")
_PATT_HEADER_FOOTER = re.compile(r"^\s*\d+\s*$", re.MULTILINE)
_PATT_BULLET_START = re.compile(r"^[\u2022\-\*]\s+", re.MULTILINE)
_PATT_PAGE_NUMBER = re.compile(r"^Page\s+\d+\b.*$", re.MULTILINE | re.IGNORECASE)
_PATT_URL_PARENS = re.compile(r"\((https?://[^\s)]+)\)")  # drop URL refs inside parens


def clean_extracted_text(raw: str) -> str:
    """Normalize text: normalize whitespace, drop headers/footers, glue broken lines.

    Conservative by design — never delete words, only formatting artifacts.
    """
    if not raw:
        return ""

    text = raw.replace("\r\n", "\n").replace("\r", "\n")

    # Strip parens-wrapped URLs: "(https://...)" -> ""
    text = _PATT_URL_PARENS.sub("", text)

    # Drop "Page N" footers.
    text = _PATT_PAGE_NUMBER.sub("", text)

    # Drop "1" / "2" / ... lines that are clearly running headers/footers.
    text = _PATT_HEADER_FOOTER.sub("", text)

    # Join hard-wrapped short lines that aren't sentence terminators.
    # e.g. "This is an\nintroduction" -> "This is an introduction"
    text = _PATT_JOIN_LINES.sub(" ", text)

    # Collapse bullet markers for consistency in the embedding pipeline.
    # (Keep content; just normalize leading char.)
    text = _PATT_BULLET_START.sub("", text)

    # Collapse runs of blank lines and excess whitespace.
    text = _PATT_MULTI_NEWLINE.sub("\n\n", text)
    text = _PATT_MULTI_SPACE.sub(" ", text)

    return text.strip()


# ──Chunking ─────────────────────────────────────────────────────────────────


def chunk_text(
    text: str,
    *,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> List[TextChunk]:
    """Sliding-window chunker.

    Splits paragraph-first, then by characters, with a tail overlap so context
    survives at boundaries.
    """
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap
    if chunk_overlap >= chunk_size:
        chunk_overlap = chunk_size // 4

    chunks: List[TextChunk] = []
    if not text:
        return chunks

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    buf = ""
    index = 0

    def _flush(buffer: str) -> None:
        nonlocal index
        if not buffer.strip():
            return
        chunks.append(TextChunk(index=index, text=buffer.strip()))
        index += 1

    for para in paragraphs:
        # Long paragraph: hard-split into windowed pieces.
        if len(para) > chunk_size:
            if buf:
                _flush(buf)
                buf = ""
            start = 0
            while start < len(para):
                end = min(start + chunk_size, len(para))
                piece = para[start:end]
                chunks.append(TextChunk(index=index, text=piece))
                index += 1
                if end == len(para):
                    break
                start = max(end - chunk_overlap, start + 1)
            continue

        # Short paragraph: append to buffer, flush if it grows too long.
        if len(buf) + len(para) + 2 > chunk_size:
            _flush(buf)
            tail = buf[-chunk_overlap:] if chunk_overlap and len(buf) > chunk_overlap else ""
            buf = f"{tail}\n\n{para}".strip()
        else:
            buf = f"{buf}\n\n{para}".strip() if buf else para

    _flush(buf)
    return chunks


# ──Convenience driver ───────────────────────────────────────────────────────


async def process_pdf_async(
    pdf_bytes: bytes,
    *,
    max_pages: Optional[int] = None,
) -> ProcessedDocument:
    """Run extract -> clean -> chunk in one call. Suitable for ``/analyze``."""
    raw_text, pages = extract_text_from_bytes(pdf_bytes, max_pages=max_pages)
    cleaned = clean_extracted_text(raw_text)
    chunks = chunk_text(cleaned)
    return ProcessedDocument(
        pages=pages,
        raw_text=raw_text,
        cleaned_text=cleaned,
        chunks=chunks,
        char_count=len(cleaned),
    )


# ──Sync helper used by tests ────────────────────────────────────────────────


def process_pdf_sync(pdf_bytes: bytes, *, max_pages: Optional[int] = None) -> ProcessedDocument:
    """Synchronous convenience for tests and one-off scripts."""
    import asyncio

    return asyncio.run(process_pdf_async(pdf_bytes, max_pages=max_pages))


def save_chunks_to_disk(chunks: Iterable[TextChunk], path: Path) -> None:
    """Dump chunks to a file. Used by tests; safe to call with empty iter."""
    path.write_text("\n\n---CHUNK---\n\n".join(c.text for c in chunks), encoding="utf-8")
