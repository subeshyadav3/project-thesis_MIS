"""Embeddings utilities using NVIDIA NIM embedding models (or a local fallback).

Generates dense vector embeddings for proposal/thesis PDF/DOCX text so we can
later do similarity / plagiarism checks.
"""
from __future__ import annotations

import hashlib
import math
from typing import List

from .config import settings


def _chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
    """Split long text into overlapping chunks for stable embeddings."""
    text = (text or "").strip()
    if not text:
        return []
    chunks: List[str] = []
    i = 0
    n = len(text)
    while i < n:
        end = min(i + chunk_size, n)
        chunks.append(text[i:end])
        if end >= n:
            break
        i = max(end - overlap, i + 1)
    return chunks


async def embed_text(text: str) -> List[float]:
    """Produce a single normalized embedding vector for a piece of text.

    Uses NVIDIA embeddings endpoint when configured, otherwise falls back to
    a deterministic hash-based pseudo-vector. The fallback is meant to keep
    pipelines working in development without an API key; it is *not* a real
    semantic embedding.
    """
    text = (text or "").strip()
    if not text:
        return []

    if not settings.nvidia_api_key:
        return _hash_fallback_embedding(text)

    try:
        import httpx

        url = "https://integrate.api.nvidia.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {settings.nvidia_api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        payload = {
            "input": [text[:8000]],
            "model": getattr(settings, "embedding_model", "nvidia/nv-embed-v1"),
            "input_type": "passage",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            vec = data["data"][0]["embedding"]
            return _normalize(vec)
    except Exception:
        return _hash_fallback_embedding(text)


async def embed_document(text: str) -> List[float]:
    """Embed a whole document by averaging normalized chunk embeddings.

    Averaging preserves document-level semantic content and keeps the vector
    length small (one fixed-size vector per document).
    """
    chunks = _chunk_text(text)
    if not chunks:
        return []

    # Limit the number of chunks we embed for performance/cost reasons
    chunks = chunks[:8]

    vectors: List[List[float]] = []
    for c in chunks:
        v = await embed_text(c)
        if v:
            vectors.append(v)
    if not vectors:
        return []
    return _average_normalized(vectors)


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


# ── Fallback helpers ─────────────────────────────────────────────

_DIM = 384


def _hash_fallback_embedding(text: str) -> List[float]:
    """Deterministic pseudo-embedding. Stable across runs but NOT semantic."""
    vec = [0.0] * _DIM
    tokens = text.lower().split()
    if not tokens:
        return vec
    for tok in tokens:
        h = int(hashlib.sha256(tok.encode("utf-8")).hexdigest()[:8], 16)
        idx = h % _DIM
        sign = 1.0 if (h // _DIM) % 2 == 0 else -1.0
        vec[idx] += sign
    # Add some positional info so chunks of the same doc are closer than
    # random other docs.
    base = hashlib.sha256(("|".join(tokens[:50])).encode("utf-8")).digest()
    for i in range(0, len(base), 4):
        chunk = int.from_bytes(base[i : i + 4], "big")
        idx = chunk % _DIM
        vec[idx] += ((chunk % 1000) / 1000.0 - 0.5) * 0.1
    return _normalize(vec)


def _normalize(v: List[float]) -> List[float]:
    norm = math.sqrt(sum(x * x for x in v))
    if norm == 0:
        return v
    return [x / norm for x in v]


def _average_normalized(vectors: List[List[float]]) -> List[float]:
    length = len(vectors[0])
    avg = [0.0] * length
    for v in vectors:
        for i, x in enumerate(v):
            avg[i] += x
    return _normalize(avg)
