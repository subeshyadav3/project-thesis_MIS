"""FastAPI routes for the AI chatbot service."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import AsyncIterator, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from ..core.analysis_repository import fetch_analysis
from ..core.chat_agent import ChatAgent
from ..core.config import settings
from ..core.embeddings import embed_text
from ..core.llm_factory import LLMAuthError, LLMUnavailableError as _Unavailable
from ..core.pdf_processor import fetch_document_bytes  # noqa: F401  (imported for typing)
from ..core.pipeline import Pipeline, get_status, has_stored_analysis  # noqa: F401
from ..core.vector_store import query_chunks as query_chunks_vectors
from ..core.vector_store import query_chunks_text, ping_vector_store
from ..models.db import ping_database
from ..models.schemas import (
    AnalyzeAcceptedResponse,
    AnalyzeRequest,
    AnalysisStatus,
    ChatFinalResponse,
    ChatRequest,
    ErrorResponse,
    HealthResponse,
)
from .deps import get_chat_agent, get_pipeline, resolve_auth_token


router = APIRouter()


# ──Health ──────────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Lightweight readiness probe used by the orchestrator."""
    from ..core.llm_factory import get_llm_factory
    from ..core.llm_factory import LLMAuthError as _AuthErr  # noqa: F401

    try:
        get_llm_factory()
        backend_ok = True
    except _AuthErr:
        backend_ok = False

    db_ok = await ping_database()
    chroma_ok = ping_vector_store()
    return HealthResponse(
        service=settings.service_title,
        backend_reachable=backend_ok,
        database_reachable=db_ok,
        vector_store_reachable=chroma_ok,
    )


# ──Pipeline lookup helper ───────────────────────────────────────────────────


def _status_or_404(proposal_id: int) -> AnalysisStatus:
    from ..core.pipeline import get_status as _gs
    s = _gs(proposal_id)
    # We always return a status object; if never seen, stage==PENDING.
    return s


# ──/analyze ─────────────────────────────────────────────────────────────────


@router.post(
    "/analyze",
    response_model=AnalyzeAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["pipeline"],
)
async def analyze(
    payload: AnalyzeRequest,
    background: BackgroundTasks,
    pipeline: Pipeline = Depends(get_pipeline),
    auth_token: Optional[str] = Depends(resolve_auth_token),
) -> AnalyzeAcceptedResponse:
    """Accept an analyze request and run the pipeline in the background.

    The backend calls this after a student uploads a PDF. ``document_url`` is
    optional: if absent, the AI service falls back to ``/api/files/groups/...``
    ``/api/files/theses/...`` patterns inferred from the proposal record.
    """
    # Fetch the actual document_url from backend context if not provided.
    document_url = payload.document_url
    if not document_url:
        document_url = await _fetch_proposal_url(payload.proposal_id, auth_token=auth_token)
        if not document_url:
            raise HTTPException(
                status_code=404,
                detail=f"Proposal {payload.proposal_id} has no associated document URL.",
            )

    # Schedule the pipeline.
    background.add_task(
        _run_pipeline_safe,
        pipeline,
        proposal_id=payload.proposal_id,
        document_url=document_url,
        document_type=await _fetch_document_type(payload.proposal_id, auth_token=auth_token),
        auth_token=auth_token,
    )

    return AnalyzeAcceptedResponse(proposal_id=payload.proposal_id)


@router.get("/status/{proposal_id}", response_model=AnalysisStatus, tags=["pipeline"])
async def status_endpoint(proposal_id: int) -> AnalysisStatus:
    """Inspect where the pipeline currently is for a given proposal."""
    return _status_or_404(proposal_id)


@router.get("/analysis/{proposal_id}", tags=["pipeline"])
async def analysis_endpoint(proposal_id: int):
    """Return the persisted analysis result for a proposal, if any."""
    record = await fetch_analysis(proposal_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"No analysis stored for proposal {proposal_id} yet.")
    return record


# ──/chat (non-streaming) ────────────────────────────────────────────────────


@router.post("/chat", response_model=ChatFinalResponse, tags=["rag"])
async def chat(
    payload: ChatRequest,
    agent: ChatAgent = Depends(get_chat_agent),
) -> ChatFinalResponse:
    """Answer a question grounded in the document's vector store."""
    try:
        return await agent.ask(
            proposal_id=payload.proposal_id,
            question=payload.question,
            top_k=payload.top_k,
            history=payload.history,
        )
    except _AuthErr:
        raise HTTPException(status_code=503, detail="LLM API key not configured on the AI service.")
    except _Unavailable:
        raise HTTPException(status_code=502, detail="LLM upstream is unavailable.")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))


# ──/chat/stream (Server-Sent Events) ────────────────────────────────────────


@router.post("/chat/stream", tags=["rag"])
async def chat_stream(
    payload: ChatRequest,
    agent: ChatAgent = Depends(get_chat_agent),
) -> StreamingResponse:
    """Stream the answer token-by-token using SSE.

    Each event is one of:
        data: {"delta": "..."}
        data: {"done": true, "answer": "...", "sources": [...]}
    """
    async def event_source() -> AsyncIterator[str]:
        try:
            async for delta, final in agent.astream(
                proposal_id=payload.proposal_id,
                question=payload.question,
                top_k=payload.top_k,
                history=payload.history,
            ):
                if delta is not None:
                    payload_js = {"delta": delta}
                    yield f"data: {json.dumps(payload_js, ensure_ascii=False)}\n\n"
                if final is not None:
                    done_js = {
                        "done": True,
                        "answer": final.answer,
                        "sources": [s.model_dump(mode="json") for s in final.sources],
                    }
                    yield f"data: {json.dumps(done_js, ensure_ascii=False)}\n\n"
        except _AuthErr:
            err = {"error": "LLM API key not configured."}
            yield f"data: {json.dumps(err)}\n\n"
        except _Unavailable:
            err = {"error": "LLM upstream is unavailable."}
            yield f"data: {json.dumps(err)}\n\n"
        except Exception as exc:  # noqa: BLE001
            err = {"error": str(exc)}
            yield f"data: {json.dumps(err)}\n\n"

    return StreamingResponse(event_source(), media_type="text/event-stream")


# ──Internal helpers ─────────────────────────────────────────────────────────


async def _run_pipeline_safe(
    pipeline: Pipeline,
    *,
    proposal_id: int,
    document_url: str,
    document_type: str,
    auth_token: Optional[str],
) -> None:
    """Run the pipeline swallowing exceptions (already tracked in status)."""
    try:
        await pipeline.run(
            proposal_id=proposal_id,
            document_url=document_url,
            document_type=document_type,
            auth_token=auth_token,
        )
    except Exception as exc:  # noqa: BLE001
        from ..core.logger import get_logger as _lg
        _lg(__name__).error("Background pipeline failed for %d: %s", proposal_id, exc)


async def _fetch_proposal_url(proposal_id: int, *, auth_token: Optional[str]) -> Optional[str]:
    """Query the Express backend for the Proposal row to find document_url."""
    import httpx

    url = f"{settings.backend_base_url.rstrip('/')}/api/proposals/{proposal_id}"
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    try:
        async with httpx.AsyncClient(timeout=settings.backend_request_timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("documentUrl") or data.get("document_url")
    except httpx.TransportError as exc:
        from ..core.logger import get_logger as _lg
        _lg(__name__).warning("Could not fetch proposal %d: %s", proposal_id, exc)
    return None


async def _fetch_document_type(proposal_id: int, *, auth_token: Optional[str]) -> str:
    """Return the document type from the Proposal (defaults to PROPOSAL)."""
    import httpx

    url = f"{settings.backend_base_url.rstrip('/')}/api/proposals/{proposal_id}"
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    try:
        async with httpx.AsyncClient(timeout=settings.backend_request_timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            dt = data.get("documentType") or data.get("document_type")
            if isinstance(dt, str) and dt:
                return dt
    except Exception:  # noqa: BLE001
        pass
    return "PROPOSAL"


# ──Error aliases (avoids widely-importing LLM exception classes) ────────────


_AuthErr = LLMAuthError  # type: ignore[assignment]
