"""ChromaDB-backed vector store for document chunks.

Each Proposal gets its own Chroma "collection" so chunks are isolated per
document (cleaner deletes, faster retrieval).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from .config import settings
from .logger import get_logger


logger = get_logger(__name__)


_client = None


def _ensure_dir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def _get_client():
    """Lazy-create a Chroma persistent client."""
    global _client
    if _client is not None:
        return _client

    try:
        import chromadb
        from chromadb.config import Settings as ChromaSettings
    except ImportError as exc:
        raise RuntimeError("chromadb is not installed. See requirements.txt.") from exc

    _ensure_dir(settings.chroma_persist_dir)
    _client = chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    return _client


def _collection_name(proposal_id: int) -> str:
    return f"proposal_{proposal_id}"


def _chromadb_collection(proposal_id: int):
    """Return (creating-if-missing) the per-proposal collection."""
    client = _get_client()
    name = _collection_name(proposal_id)
    try:
        return client.get_collection(name)
    except Exception:  # noqa: BLE001
        return client.create_collection(
            name,
            metadata={"proposal_id": str(proposal_id), "hnsw:space": "cosine"},
        )


# ──Public API ──────────────────────────────────────────────────────────────


def store_chunks(
    proposal_id: int,
    chunk_texts: List[str],
    chunk_vectors: List[List[float]],
    *,
    metadata: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Insert or replace all chunks for a proposal.

    Existing chunks for the same proposal are removed first to keep state
    consistent across re-runs.
    """
    if not chunk_texts:
        return {"stored": 0, "ids": []}

    if len(chunk_texts) != len(chunk_vectors):
        raise ValueError("chunk_texts and chunk_vectors must have the same length")

    coll = _chromadb_collection(proposal_id)

    # Wipe any previous content for this proposal.
    try:
        existing = coll.get(include=[])
        if existing and existing.get("ids"):
            coll.delete(ids=existing["ids"])
    except Exception:  # noqa: BLE001
        # First run for this proposal — nothing to delete.
        pass

    ids = [f"{proposal_id}_chunk_{i}" for i in range(len(chunk_texts))]
    meta = metadata or [{}] * len(chunk_texts)
    # Normalize metadata: only allow primitive types.
    clean_meta = []
    for m in meta:
        clean_meta.append({k: v for k, v in m.items() if isinstance(v, (str, int, float, bool))})

    coll.add(ids=ids, documents=chunk_texts, embeddings=chunk_vectors, metadatas=clean_meta)
    logger.info("Stored %d chunks for proposal %d", len(ids), proposal_id)
    return {"stored": len(ids), "ids": ids}


def query_chunks(
    proposal_id: int,
    query_vector: List[float],
    *,
    top_k: int = 4,
) -> List[Dict[str, Any]]:
    """Return top-k chunks sorted by descending similarity."""
    coll = _chromadb_collection(proposal_id)
    try:
        result = coll.query(
            query_embeddings=[query_vector],
            n_results=max(1, min(top_k, 50)),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("ChromaDB query failed for proposal %d: %s", proposal_id, exc)
        return _empty()

    return _flatten_query_result(result)


def query_chunks_text(
    proposal_id: int,
    query_text: str,
    *,
    top_k: int = 4,
    query_vector: Optional[List[float]] = None,
) -> List[Dict[str, Any]]:
    """Convenience that embeds the query and forwards to ``query_chunks``."""
    from .embeddings import embed_text

    vector = query_vector or embed_text(query_text)
    return query_chunks(proposal_id, vector, top_k=top_k)


def delete_proposal_chunks(proposal_id: int) -> bool:
    """Drop the entire collection for a proposal."""
    client = _get_client()
    name = _collection_name(proposal_id)
    try:
        client.delete_collection(name)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("ChromaDB delete failed for proposal %d: %s", proposal_id, exc)
        return False


def collection_count(proposal_id: int) -> int:
    """Return how many chunks exist for a proposal (0 if collection absent)."""
    try:
        coll = _chromadb_collection(proposal_id)
        existing = coll.get(include=[])
        return len(existing.get("ids") or [])
    except Exception:  # noqa: BLE001
        return 0


def ping_vector_store() -> bool:
    try:
        client = _get_client()
        client.heartbeat()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("ChromaDB heartbeat failed: %s", exc)
        return False


# ──Helpers ─────────────────────────────────────────────────────────────────


def _empty() -> List[Dict[str, Any]]:
    return []


def _flatten_query_result(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Chroma returns nested lists (one per query). Flatten and zip into rows."""
    docs = (result.get("documents") or [[]])[0]
    ids = (result.get("ids") or [[]])[0]
    metas = (result.get("metadatas") or [[]])[0]
    dists = (result.get("distances") or [[]])[0]

    out: List[Dict[str, Any]] = []
    for i, text in enumerate(docs):
        doc_id = ids[i] if i < len(ids) else ""
        meta = metas[i] if i < len(metas) else {}
        dist = dists[i] if i < len(dists) else 1.0
        # Cosine distance -> similarity.
        relevance = max(0.0, min(1.0, 1.0 - float(dist)))
        page_val = meta.get("page") if isinstance(meta, dict) else None
        try:
            page = int(page_val) if page_val is not None else None
        except (TypeError, ValueError):
            page = None
        out.append(
            {
                "chunk_id": str(doc_id),
                "text": str(text),
                "relevance": relevance,
                "page": page,
            }
        )
    return out
