"""Pydantic DTOs for the AI chatbot service.

Public request/response shapes. Internal flows may carry richer objects.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ──Enums ──────────────────────────────────────────────────────────────────


class PipelineStage(str, Enum):
    """Current step the pipeline is executing."""

    PENDING = "PENDING"
    FETCHING = "FETCHING"
    EXTRACTING = "EXTRACTING"
    CLEANING = "CLEANING"
    CHUNKING = "CHUNKING"
    EMBEDDING = "EMBEDDING"
    STORING = "STORING"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ScoreBand(str, Enum):
    """Qualitative band derived from a /10 numeric score."""

    EXCELLENT = "excellent"   # 9.0-10
    STRONG = "strong"         # 7.5-8.9
    ADEQUATE = "adequate"     # 5.5-7.4
    WEAK = "weak"             # 3.5-5.4
    POOR = "poor"             # 0.0-3.4


# ──Score model ─────────────────────────────────────────────────────────────


class CriterionScore(BaseModel):
    key: str
    label: str
    score: float = Field(..., ge=0.0, le=10.0)
    band: ScoreBand
    reason: str
    evidence: Optional[str] = None


class EvaluationReport(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=10.0)
    overall_band: ScoreBand
    criteria: List[CriterionScore]
    summary: str


class DocumentAnalysis(BaseModel):
    summary: str
    keywords: List[str] = Field(default_factory=list)
    evaluation: EvaluationReport
    char_count: int = 0
    chunk_count: int = 0
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


# ──/analyze ────────────────────────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    proposal_id: int = Field(..., gt=0)
    document_url: Optional[str] = None
    force_recompute: bool = False


class AnalyzeAcceptedResponse(BaseModel):
    proposal_id: int
    status: str = "accepted"
    message: str = (
        "Document queued for analysis. Track progress via /status/{proposal_id}."
    )


class AnalysisStatus(BaseModel):
    proposal_id: int
    stage: PipelineStage
    error: Optional[str] = None
    char_count: int = 0
    chunk_count: int = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ──/chat ───────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    proposal_id: int = Field(..., gt=0)
    question: str = Field(..., min_length=3, max_length=2000)
    top_k: Optional[int] = Field(default=None, ge=1, le=20)
    history: List[Dict[str, str]] = Field(default_factory=list)


class ChatRetrievedChunk(BaseModel):
    chunk_id: str
    text: str
    relevance: float = Field(..., ge=0.0, le=1.0)
    page: Optional[int] = None


class ChatSource(BaseModel):
    chunk_id: str
    snippet: str
    relevance: float


class ChatFinalResponse(BaseModel):
    proposal_id: int
    question: str
    answer: str
    sources: List[ChatSource] = Field(default_factory=list)


# ──Generic ─────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str
    backend_reachable: bool
    database_reachable: bool
    vector_store_reachable: bool


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[Any] = None
