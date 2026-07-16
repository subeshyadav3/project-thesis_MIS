"""Persistence layer for AI analysis results.

Stores per-proposal AI analyses into PostgreSQL and pushes status updates to
the Express backend through its ``/api/ai/embed`` companion endpoint (so the
shared ``document_embedding`` table always reflects the latest run).
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import select

from .config import settings
from .logger import get_logger
from ..models.database import AIDocumentAnalysis
from ..models.db import session_scope


logger = get_logger(__name__)


# ──CRUD on ai_document_analysis ─────────────────────────────────────────────


async def upsert_analysis(
    *,
    proposal_id: int,
    summary: str,
    keywords: List[str],
    overall_score: float,
    overall_band: str,
    evaluation: Dict[str, Any],
    char_count: int,
    chunk_count: int,
    model: str = "meta/llama-3.1-70b-instruct",
) -> int:
    """Create-or-update the analysis row. Returns the row id."""
    async with session_scope() as session:
        existing = await session.execute(
            select(AIDocumentAnalysis).where(AIDocumentAnalysis.proposal_id == proposal_id)
        )
        row = existing.scalar_one_or_none()
        if row is None:
            row = AIDocumentAnalysis(
                proposal_id=proposal_id,
                summary=summary,
                keywords=keywords,
                overall_score=overall_score,
                overall_band=overall_band,
                evaluation=evaluation,
                char_count=char_count,
                chunk_count=chunk_count,
                model=model,
            )
            session.add(row)
        else:
            row.summary = summary
            row.keywords = keywords
            row.overall_score = overall_score
            row.overall_band = overall_band
            row.evaluation = evaluation
            row.char_count = char_count
            row.chunk_count = chunk_count
            row.model = model
        await session.flush()
        return row.id


async def fetch_analysis(proposal_id: int) -> Optional[Dict[str, Any]]:
    async with session_scope() as session:
        result = await session.execute(
            select(AIDocumentAnalysis).where(AIDocumentAnalysis.proposal_id == proposal_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return {
            "id": row.id,
            "proposal_id": row.proposal_id,
            "summary": row.summary,
            "keywords": list(row.keywords or []),
            "overall_score": row.overall_score,
            "overall_band": row.overall_band,
            "evaluation": dict(row.evaluation or {}),
            "char_count": row.char_count,
            "chunk_count": row.chunk_count,
            "model": row.model,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }


# ──Push status back to Express backend (best-effort) ───────────────────────


async def notify_backend_status(
    *,
    proposal_id: int,
    status: str,
    vector: Optional[List[float]] = None,
    char_count: Optional[int] = None,
    chunk_count: Optional[int] = None,
    summary_text: Optional[str] = None,
    evaluation: Optional[Dict[str, Any]] = None,
    document_type: str = "PROPOSAL",
) -> bool:
    """Tell the Express backend about the AI status.

    The backend's ``/api/ai/embed/:id`` endpoint persists into the shared
    ``document_embedding`` table and writes the embeddings + metadata we computed.

    This call is best-effort: failures are logged, never raised.
    """
    url = f"{settings.backend_base_url.rstrip('/')}/api/ai/embed/{proposal_id}"
    payload: Dict[str, Any] = {"status_input": status, "document_type": document_type}

    if vector is not None:
        payload["vector"] = vector
    if char_count is not None:
        payload["char_count"] = char_count
    if chunk_count is not None:
        payload["chunk_count"] = chunk_count
    if summary_text is not None:
        payload["summary_text"] = summary_text
    if evaluation is not None:
        payload["evaluation"] = evaluation

    headers = {"Content-Type": "application/json"}
    if settings.backend_internal_token:
        headers["X-Internal-Token"] = settings.backend_internal_token

    try:
        async with httpx.AsyncClient(timeout=settings.backend_request_timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
        return resp.status_code < 400
    except httpx.TransportError as exc:
        logger.warning("Backend notify failed for proposal %d: %s", proposal_id, exc)
        return False


# ──JSON helpers ─────────────────────────────────────────────────────────────


def safe_json(obj: Any) -> str:
    return json.dumps(obj, default=str, ensure_ascii=False)
