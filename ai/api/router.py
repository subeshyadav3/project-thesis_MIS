"""Router: /api/ai/* endpoints."""
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from core.summarizer import build_summarizer
from core.marker import build_evaluator
from core.ask_agent import build_ask_agent
from core.config import settings

router = APIRouter()

summarizer = None
evaluator = None
ask_agent = None


def get_summarizer():
    global summarizer
    if summarizer is None:
        summarizer = build_summarizer()
    return summarizer


def get_evaluator():
    global evaluator
    if evaluator is None:
        evaluator = build_evaluator()
    return evaluator


def get_ask_agent():
    global ask_agent
    if ask_agent is None:
        ask_agent = build_ask_agent()
    return ask_agent


def resolve_key(data: dict):
    """Set the NVIDIA API key from request body or backend .env."""
    key = data.get("nvidia_api_key", "")
    if key:
        settings.nvidia_api_key = key
    elif not settings.nvidia_api_key:
        env_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', '.env')
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.strip().startswith('NVIDIA_API_KEY') or line.strip().startswith('DEEPSEARCH_API_KEY'):
                        settings.nvidia_api_key = line.split('=', 1)[1].strip()
                        break


class SummarizeRequest(BaseModel):
    proposal_id: int
    document_text: str
    nvidia_api_key: Optional[str] = None


class EvaluateRequest(BaseModel):
    proposal_id: int
    document_text: str
    criteria: List[dict]
    nvidia_api_key: Optional[str] = None


class AskRequest(BaseModel):
    proposal_id: int
    document_text: str
    question: str
    nvidia_api_key: Optional[str] = None


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    resolve_key(req.model_dump())
    try:
        state = {"proposal_id": req.proposal_id, "document_text": req.document_text, "summary": {}, "error": None}
        result = await get_summarizer().ainvoke(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        return {"summary": result.get("summary", {})}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate")
async def evaluate(req: EvaluateRequest):
    resolve_key(req.model_dump())
    try:
        state = {
            "proposal_id": req.proposal_id,
            "document_text": req.document_text,
            "criteria": req.criteria,
            "scores": [],
            "total_marks": 0.0,
            "max_marks": 0.0,
            "error": None,
        }
        result = await get_evaluator().ainvoke(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        return {
            "scores": result.get("scores", []),
            "total_marks": result.get("total_marks", 0),
            "max_marks": result.get("max_marks", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask")
async def ask(req: AskRequest):
    resolve_key(req.model_dump())
    try:
        state = {
            "proposal_id": req.proposal_id,
            "document_text": req.document_text,
            "question": req.question,
            "answer": "",
            "error": None,
        }
        result = await get_ask_agent().ainvoke(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        return {"answer": result.get("answer", "")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
