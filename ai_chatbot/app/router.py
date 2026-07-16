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
from ..core.embeddings import embed_text, embedding_dim_for
from ..core.llm_factory import (
    LLMFactory,
    LLMAuthError,
    LLMOutputError,
    LLMUnavailableError,
    LLMUnavailableError as _Unavailable,
    get_llm_factory,
)
from ..core.pdf_processor import fetch_document_bytes  # noqa: F401  (imported for typing)
from ..core.pdf_processor import ProcessedDocument, clean_extracted_text, chunk_text
from ..core.pipeline import Pipeline, get_status, has_stored_analysis  # noqa: F401
from ..core.prompts import ANSWER_SYSTEM, ANSWER_USER_TEMPLATE
from ..core.vector_store import query_chunks as query_chunks_vectors
from ..core.vector_store import query_chunks_text, ping_vector_store
from ..models.db import ping_database
from ..models.schemas import (
    AnalyzeAcceptedResponse,
    AnalyzeRequest,
    AnalysisStatus,
    AskRequest,
    AskResponse,
    CandidatesResponse,
    CandidateVector,
    ChatFinalResponse,
    ChatRequest,
    EmbedRequest,
    EmbedResponse,
    ErrorResponse,
    EvaluateRequest,
    EvaluateResponse,
    HealthResponse,
    SimilarityMatch,
    SimilarityRequest,
    SimilarityResponse,
    SummarizeRequest,
    SummarizeResponse,
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


# ──Legacy AiAssistantModal endpoints (proxied from Express) ───────────────
#
# The Express backend's aiController.summarize / evaluate / ask / embed post
# directly to these paths. They accept pre-extracted ``document_text`` from the
# Node side and use the configured Groq LLM (the Node code forwards the legacy
# ``nvidia_api_key`` field as well, so it is accepted but ignored — if you want
# runtime override, set the GROQ_API_KEY env var instead).


def _resolve_llm_factory(nvidia_api_key: Optional[str] = None) -> LLMFactory:
    """Return an LLM factory.

    Honors the legacy ``nvidia_api_key`` field the Express bridge still sends —
    if present it is treated as a Groq key fallback so the old /summarize
    orchestration keeps working without env-var changes.
    """
    if nvidia_api_key:
        try:
            return LLMFactory(api_key=nvidia_api_key)
        except LLMAuthError:
            pass
    return get_llm_factory()


def _build_synthetic_doc(text: str) -> ProcessedDocument:
    """Wrap text into the ProcessedDocument shape analyzers expect."""
    cleaned = clean_extracted_text(text or "")
    chunks = chunk_text(cleaned)
    return ProcessedDocument(
        pages=1,
        raw_text=text or "",
        cleaned_text=cleaned,
        chunks=chunks,
        char_count=len(cleaned),
    )


@router.post("/summarize", tags=["legacy"])
async def summarize_endpoint(payload: SummarizeRequest):
    """Generate a structured summary for ``document_text`` in one LLM call."""
    try:
        factory = _resolve_llm_factory(payload.nvidia_api_key)
    except LLMAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    system = (
        "You are a senior academic reviewer. Analyze the following project/thesis "
        "document and produce a structured summary in JSON format with these keys:\n"
        "- executive_summary (2-3 sentences)\n"
        "- objectives (bullet list)\n"
        "- methodology (brief description)\n"
        "- expected_outcomes (bullet list)\n"
        "- strengths (2-3 points)\n"
        "- weaknesses_or_risks (2-3 points)\n\n"
        "Respond ONLY with valid JSON."
    )
    user_prefix = (payload.custom_prompt + "\n\n") if payload.custom_prompt else ""
    user = (
        f"{user_prefix}DOCUMENT TYPE: {payload.document_type or 'PROPOSAL'}\n\n"
        f"DOCUMENT TEXT:\n{payload.document_text[:30000]}"
    )

    try:
        raw = await factory.acomplete_json(
            system=system,
            user=user,
            temperature=0.2,
            max_tokens=4096,
            retry_on_fail=2,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except LLMOutputError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "summary": raw,
        "document_type": payload.document_type or "PROPOSAL",
        "custom": bool(payload.custom_prompt and payload.custom_prompt.strip()),
        "model": factory.model,
    }


@router.post("/summarize/stream", tags=["legacy"])
async def summarize_stream_endpoint(payload: SummarizeRequest):
    """Stream the summary text, then send the parsed JSON result."""
    try:
        factory = _resolve_llm_factory(payload.nvidia_api_key)
    except LLMAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    system = (
        "You are a senior academic reviewer. Analyze the following project/thesis "
        "document and produce a structured summary in JSON format with these keys:\n"
        "- executive_summary (2-3 sentences)\n"
        "- objectives (bullet list)\n"
        "- methodology (brief description)\n"
        "- expected_outcomes (bullet list)\n"
        "- strengths (2-3 points)\n"
        "- weaknesses_or_risks (2-3 points)\n\n"
        "Respond ONLY with valid JSON."
    )
    user_prefix = (payload.custom_prompt + "\n\n") if payload.custom_prompt else ""
    user = (
        f"{user_prefix}DOCUMENT TYPE: {payload.document_type or 'PROPOSAL'}\n\n"
        f"DOCUMENT TEXT:\n{payload.document_text[:30000]}"
    )

    async def _stream():
        buf = ""
        try:
            async for chunk in factory.astream(system=system, user=user, temperature=0.2, max_tokens=4096):
                buf += chunk
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
            import json as _json
            try:
                parsed = _json.loads(buf.strip().removeprefix("```json").removesuffix("```").strip())
            except _json.JSONDecodeError:
                parsed = {"executive_summary": buf.strip()[:500], "objectives": [], "methodology": "", "expected_outcomes": [], "strengths": [], "weaknesses_or_risks": []}
            yield f"data: {json.dumps({'done': True, 'result': {'summary': parsed, 'document_type': payload.document_type or 'PROPOSAL', 'custom': bool(payload.custom_prompt and payload.custom_prompt.strip()), 'model': factory.model}})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    from fastapi.responses import StreamingResponse
    return StreamingResponse(_stream(), media_type="text/event-stream")


@router.post("/evaluate", tags=["legacy"], response_model=EvaluateResponse)
async def evaluate_endpoint(payload: EvaluateRequest) -> EvaluateResponse:
    """Score ``document_text`` against a list of criteria via the LLM."""
    try:
        factory = _resolve_llm_factory(payload.nvidia_api_key)
    except LLMAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    criteria_list = payload.criteria or []
    if not criteria_list:
        raise HTTPException(status_code=400, detail="criteria array is required")

    crit_lines = []
    for c in criteria_list:
        weight = c.weight if c.weight is not None else 1.0
        desc = c.description or c.label or c.key
        crit_lines.append(f"- {c.key} ({c.label or c.key}, weight {weight}): {desc}")

    system = (
        "You are a senior academic reviewer scoring a student proposal. "
        "Return STRICT JSON: each criterion row has score (0-10), reason "
        "(2-3 sentences), and an optional evidence snippet. Be honest and concise."
    )
    user = (
        "Score the document TEXT below against each criterion.\n\n"
        f"CRITERIA:\n" + "\n".join(crit_lines) + "\n\n"
        f"TYPE: {payload.document_type or 'PROPOSAL'}\n"
        + (f"EXTRA INSTRUCTIONS: {payload.custom_instructions}\n" if payload.custom_instructions else "")
        + "\nDOCUMENT TEXT:\n"
        + payload.document_text
        + "\n\nReturn JSON in this exact shape:\n"
        + '{"overall_score": <number>, '
        + '"summary": "<2-3 sentence verdict>", '
        + '"criteria": ['
        + '{...one entry per criterion key, fields: key, score, reason, evidence?"}, '
        + '...]}'
    )

    try:
        raw = await factory.acomplete_json(
            system=system,
            user=user,
            temperature=0.1,
            max_tokens=4096,
            retry_on_fail=2,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except LLMOutputError as exc:
        # Best-effort synthesis so the legacy modal doesn't break entirely.
        return EvaluateResponse(
            overall_score=0.0,
            summary=f"Evaluation unavailable: {exc}",
            criteria=[
                _evaluate_fallback_row(c) for c in criteria_list
            ],
        )

    result_scores = []
    by_key = {str(r.get("key") or "").strip().lower(): r for r in (raw.get("criteria") or [])}
    for c in criteria_list:
        row = by_key.get(c.key.strip().lower()) or {}
        score = _clamp_score(float(row.get("score", 0)))
        result_scores.append({
            "key": c.key,
            "label": c.label or c.key,
            "score": score,
            "reason": str(row.get("reason") or "No reason provided.").strip(),
            "evidence": (str(row.get("evidence")).strip() if row.get("evidence") else None),
        })

    overall = float(raw.get("overall_score") or 0)
    if not overall and result_scores:
        overall = sum(s["score"] for s in result_scores) / len(result_scores)
    overall = _clamp_score(overall)

    summary_text = str(raw.get("summary") or raw.get("summary_overall") or "").strip()
    if not summary_text:
        summary_text = "Evaluation complete. See per-criterion reasons."

    return EvaluateResponse(
        overall_score=overall,
        summary=summary_text,
        criteria=result_scores,
        model=factory.model,
    )


@router.post("/evaluate/stream", tags=["legacy"])
async def evaluate_stream_endpoint(payload: EvaluateRequest):
    """Stream evaluation text, then send parsed result."""
    try:
        factory = _resolve_llm_factory(payload.nvidia_api_key)
    except LLMAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    criteria_list = payload.criteria or []
    if not criteria_list:
        raise HTTPException(status_code=400, detail="criteria array is required")

    crit_lines = []
    for c in criteria_list:
        weight = c.weight if c.weight is not None else 1.0
        desc = c.description or c.label or c.key
        crit_lines.append(f"- {c.key} ({c.label or c.key}, weight {weight}): {desc}")

    system = (
        "You are a senior academic reviewer scoring a student proposal. "
        "Return STRICT JSON: each criterion row has score (0-10), reason "
        "(2-3 sentences), and an optional evidence snippet. Be honest and concise."
    )
    user = (
        "Score the document TEXT below against each criterion.\n\n"
        f"CRITERIA:\n" + "\n".join(crit_lines) + "\n\n"
        f"TYPE: {payload.document_type or 'PROPOSAL'}\n"
        + (f"EXTRA INSTRUCTIONS: {payload.custom_instructions}\n" if payload.custom_instructions else "")
        + "\nDOCUMENT TEXT:\n"
        + payload.document_text
        + "\n\nReturn JSON in this exact shape:\n"
        + '{"overall_score": <number>, '
        + '"summary": "<2-3 sentence verdict>", '
        + '"criteria": ['
        + '{...one entry per criterion key, fields: key, score, reason, evidence"}, '
        + '...]}'
    )

    async def _stream():
        buf = ""
        try:
            async for chunk in factory.astream(system=system, user=user, temperature=0.1, max_tokens=4096):
                buf += chunk
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
            import json as _json
            try:
                raw = _json.loads(buf.strip().removeprefix("```json").removesuffix("```").strip())
            except _json.JSONDecodeError:
                raw = {"overall_score": 0, "summary": "Parse failed", "criteria": []}
            result_scores = []
            by_key = {str(r.get("key") or "").strip().lower(): r for r in (raw.get("criteria") or [])}
            for c in criteria_list:
                row = by_key.get(c.key.strip().lower()) or {}
                result_scores.append({
                    "key": c.key, "label": c.label or c.key,
                    "score": _clamp_score(float(row.get("score", 0))),
                    "reason": str(row.get("reason") or "No reason provided.").strip(),
                    "evidence": str(row.get("evidence")).strip() if row.get("evidence") else None,
                })
            overall = float(raw.get("overall_score") or 0)
            if not overall and result_scores:
                overall = sum(s["score"] for s in result_scores) / len(result_scores)
            overall = _clamp_score(overall)
            summary_text = str(raw.get("summary") or raw.get("summary_overall") or "").strip()
            if not summary_text:
                summary_text = "Evaluation complete. See per-criterion reasons."
            yield f"data: {json.dumps({'done': True, 'result': {'overall_score': overall, 'summary': summary_text, 'criteria': result_scores, 'model': factory.model}})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    from fastapi.responses import StreamingResponse
    return StreamingResponse(_stream(), media_type="text/event-stream")


def _clamp_score(value: float) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(10.0, round(v, 1)))


def _evaluate_fallback_row(c) -> dict:
    return {
        "key": c.key,
        "label": c.label or c.key,
        "score": 0.0,
        "reason": "Evaluation unavailable — model output could not be parsed.",
        "evidence": None,
    }


@router.post("/ask", tags=["legacy"], response_model=AskResponse)
async def ask_endpoint(payload: AskRequest) -> AskResponse:
    """Answer a free-form question grounded in ``document_text`` directly.

    Unlike the /chat endpoint (which queries the vector store), this legacy
    endpoint just feeds the document verbatim into the LLM as context.
    """
    try:
        factory = _resolve_llm_factory(payload.nvidia_api_key)
    except LLMAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    user = (
        "DOCUMENT TYPE: " + (payload.document_type or "PROPOSAL") + "\n\n"
        "DOCUMENT TEXT:\n" + payload.document_text + "\n\nQUESTION: " + payload.question
    )

    try:
        answer = await factory.acomplete(
            system=ANSWER_SYSTEM,
            user=user,
            temperature=0.2,
            max_tokens=900,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return AskResponse(answer=answer, question=payload.question, model=factory.model)


@router.post("/ask/stream", tags=["legacy"])
async def ask_stream_endpoint(payload: AskRequest):
    """Stream the answer token-by-token using SSE."""
    try:
        factory = _resolve_llm_factory(payload.nvidia_api_key)
    except LLMAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    system = ANSWER_SYSTEM
    user = (
        "DOCUMENT TYPE: " + (payload.document_type or "PROPOSAL") + "\n\n"
        "DOCUMENT TEXT:\n" + payload.document_text + "\n\nQUESTION: " + payload.question
    )

    async def _stream():
        try:
            async for chunk in factory.astream(system=system, user=user, temperature=0.2, max_tokens=900):
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True, 'question': payload.question})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    from fastapi.responses import StreamingResponse
    return StreamingResponse(_stream(), media_type="text/event-stream")


@router.post("/embed", tags=["legacy"], response_model=EmbedResponse)
async def embed_endpoint(payload: EmbedRequest) -> EmbedResponse:
    """Return a single dense embedding vector for the supplied text.

    The Node backend persists the vector into the shared ``document_embedding``
    table, so the Python service does NOT write to the DB itself here.
    """
    text = (payload.document_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="document_text is required")
    vectors = await asyncio.to_thread(embed_text, text)
    return EmbedResponse(
        vector=vectors,
        vector_dim=len(vectors),
        char_count=len(text),
        model=settings.embedding_model_name,
    )


@router.get("/candidates", tags=["legacy"], response_model=CandidatesResponse)
async def candidates_endpoint(*, scope: str = "all") -> CandidatesResponse:
    """Return a list of stored proposal vectors used for similarity checks.

    Scoping (department/year/etc.) is done in the Express layer; this endpoint
    falls back to ``[]`` so the modal still works in dev or with a cold cache.
    """
    # The Python service does not have full access to scope filters — the Node
    # side computes the candidate list from its own DB. Returning an empty list
    # here keeps the legacy modal from breaking in environments where the Node
    # contract expects the Python side to source candidates.
    return CandidatesResponse(scope=scope, candidates=[])


@router.post("/similarity", tags=["legacy"], response_model=SimilarityResponse)
async def similarity_endpoint(payload: SimilarityRequest) -> SimilarityResponse:
    """Compute cosine similarity between the source text and each candidate."""
    text = (payload.document_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="document_text is required")
    if not payload.candidates:
        return SimilarityResponse(compared=0, matches=[])

    source_vec = await asyncio.to_thread(embed_text, text)
    src_norm = _norm(source_vec)
    if src_norm == 0:
        return SimilarityResponse(compared=len(payload.candidates), matches=[])

    scored: list[SimilarityMatch] = []
    for cand in payload.candidates:
        cand_vec = list(cand.vector or [])
        if not cand_vec or len(cand_vec) != len(source_vec):
            continue
        dot = sum(a * b for a, b in zip(source_vec, cand_vec))
        denom = src_norm * _norm(cand_vec)
        score = (dot / denom) if denom else 0.0
        # Map [-1, 1] -> [0, 1] for UI friendliness.
        score = max(0.0, min(1.0, (score + 1.0) / 2.0))
        if score >= float(payload.threshold or 0):
            scored.append(SimilarityMatch(id=cand.id, score=round(score, 4)))

    scored.sort(key=lambda m: m.score, reverse=True)
    top_k = max(1, int(payload.top_k or 5))
    return SimilarityResponse(compared=len(payload.candidates), matches=scored[:top_k])


def _norm(vec) -> float:
    return float(sum(v * v for v in vec) ** 0.5)


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
