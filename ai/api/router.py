"""Router: /api/ai/* endpoints."""
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from core.summarizer import build_summarizer
from core.marker import build_evaluator
from core.ask_agent import build_ask_agent
from core.embeddings import embed_document, embed_text
from core.similarity import find_similar
from core.config import settings

router = APIRouter()

summarizers = {}
evaluators = {}
ask_agents = {}


def get_summarizer(custom_prompt: str = None):
    key = custom_prompt or "__default__"
    if key not in summarizers:
        summarizers[key] = build_summarizer(custom_prompt)
    return summarizers[key]


def get_evaluator(custom_instructions: str = None):
    key = custom_instructions or "__default__"
    if key not in evaluators:
        evaluators[key] = build_evaluator(custom_instructions)
    return evaluators[key]


def get_ask_agent():
    if "_global" not in ask_agents:
        ask_agents["_global"] = build_ask_agent()
    return ask_agents["_global"]


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
    document_type: Optional[str] = "PROPOSAL"
    custom_prompt: Optional[str] = None
    nvidia_api_key: Optional[str] = None


class EvaluateRequest(BaseModel):
    proposal_id: int
    document_text: str
    criteria: List[dict]
    document_type: Optional[str] = "PROPOSAL"
    custom_instructions: Optional[str] = None
    nvidia_api_key: Optional[str] = None


class AskRequest(BaseModel):
    proposal_id: int
    document_text: str
    question: str
    document_type: Optional[str] = "PROPOSAL"
    nvidia_api_key: Optional[str] = None


class EmbedRequest(BaseModel):
    proposal_id: int
    document_text: str
    document_type: Optional[str] = "PROPOSAL"
    nvidia_api_key: Optional[str] = None


class SimilarityRequest(BaseModel):
    proposal_id: int
    document_text: str
    candidates: List[dict]
    top_k: int = 5
    threshold: float = 0.0
    document_type: Optional[str] = "PROPOSAL"
    nvidia_api_key: Optional[str] = None


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    resolve_key(req.model_dump())
    try:
        state = {
            "proposal_id": req.proposal_id,
            "document_text": req.document_text,
            "summary": {},
            "error": None,
        }
        result = await get_summarizer(req.custom_prompt).ainvoke(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        return {
            "summary": result.get("summary", {}),
            "document_type": req.document_type,
            "custom": bool(req.custom_prompt and req.custom_prompt.strip()),
        }
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
        result = await get_evaluator(req.custom_instructions).ainvoke(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        return {
            "scores": result.get("scores", []),
            "total_marks": result.get("total_marks", 0),
            "max_marks": result.get("max_marks", 0),
            "document_type": req.document_type,
            "custom": bool(req.custom_instructions and req.custom_instructions.strip()),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embed")
async def embed(req: EmbedRequest):
    resolve_key(req.model_dump())
    try:
        vector = await embed_document(req.document_text)
        return {
            "vector_dim": len(vector),
            "vector": vector,
            "char_count": len(req.document_text or ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similarity")
async def similarity(req: SimilarityRequest):
    resolve_key(req.model_dump())
    try:
        target_vector = await embed_document(req.document_text)
        matches = await find_similar(target_vector, req.candidates, top_k=req.top_k, threshold=req.threshold)
        return {
            "matches": matches,
            "compared": len(req.candidates),
            "document_type": req.document_type,
        }
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
