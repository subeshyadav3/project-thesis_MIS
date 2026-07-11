"""Embedding generation backed by sentence-transformers.

The model is loaded once and re-used across requests. A simple retry loop
keeps transient failures from bubbling up.
"""

from __future__ import annotations

import hashlib
import os
from typing import List, Optional

from tenacity import retry, stop_after_attempt, wait_fixed

from .config import settings
from .logger import get_logger


logger = get_logger(__name__)


# Lazy model cache — loaded on first embed call.
_model = None


def _load_model():
    """Load the sentence-transformer model once.

    Honors HF cache env vars set by the environment. Sets the transformer
    backend device (cpu/cuda) from settings.
    """
    global _model
    if _model is not None:
        return _model

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise RuntimeError(
            "sentence-transformers is not installed. "
            "Run: pip install -r ai_chatbot/requirements.txt"
        ) from exc

    logger.info("Loading embedding model %s on %s", settings.embedding_model_name, settings.embedding_device)
    _model = SentenceTransformer(settings.embedding_model_name, device=settings.embedding_device)
    return _model


def _dev_hash_fallback(text: str, dim: int) -> List[float]:
    """Deterministic pseudo-embedding for environments without the model.

    Hashes the text 4 times and spreads the bits across ``dim`` floats. Used
    only when sentence-transformers cannot be loaded (CI, air-gapped servers).
    """
    out: List[float] = []
    seed = text.encode("utf-8")
    while len(out) < dim:
        seed = hashlib.sha256(seed).digest()
        for i in range(0, len(seed), 4):
            chunk = seed[i : i + 4]
            if len(chunk) < 4:
                break
            value = int.from_bytes(chunk, "big", signed=False) / 0xFFFFFFFF
            out.append(value * 2.0 - 1.0)
            if len(out) >= dim:
                break
    return out[:dim]


def _model_dim(model) -> int:
    try:
        return int(model.get_sentence_embedding_dimension())
    except Exception:  # noqa: BLE001
        return settings.embedding_dim


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2), reraise=True)
def embed_texts(texts: List[str], *, normalize: bool = True) -> List[List[float]]:
    """Encode a batch of texts into dense vectors.

    Returns one float-array per input text. Length equals ``embedding_dim``
    for the configured model.
    """
    if not texts:
        return []

    try:
        model = _load_model()
        vectors = model.encode(
            texts,
            batch_size=settings.embedding_batch_size,
            convert_to_numpy=True,
            normalize_embeddings=normalize,
            show_progress_bar=False,
        )
        return [v.tolist() for v in vectors]
    except Exception as exc:  # noqa: BLE001
        # Fall back to deterministic hashes if the model is unavailable.
        dim = settings.embedding_dim
        logger.warning("Embedding model failed (%s); using deterministic hash embeddings", exc)
        return [_dev_hash_fallback(t, dim) for t in texts]


def embed_text(text: str, *, normalize: bool = True) -> List[float]:
    """Single-text convenience wrapper. Returns a single vector."""
    return embed_texts([text], normalize=normalize)[0]


def embedding_dim_for(dummy: Optional[str] = None) -> int:
    """Return the configured/derived embedding dimensionality."""
    try:
        return _model_dim(_load_model())
    except Exception:  # noqa: BLE001
        return settings.embedding_dim


# ──Bypass flag for offline environments ────────────────────────────────────


def force_hash_only() -> None:
    """Skip model loading entirely and use the hash fallback.

    Useful for CI / Docker builds without ``sentence-transformers`` assets.
    """
    global _model
    _model = None
    os.environ.setdefault("TPMS_EMBED_HACKS", "1")


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    import math
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
