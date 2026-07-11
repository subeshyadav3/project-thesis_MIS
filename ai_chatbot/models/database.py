"""SQLAlchemy ORM models for the AI assistant tables.

The AI service owns one extra table (`ai_document_analysis`) that stores the
analysis result alongside each analyzed Proposal/Document. The existing
`document_embedding` table (already maintained by the Express backend) is
not recreated here — the AI service writes to it through the backend API.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, relationship


class _Base(DeclarativeBase):
    """Shared declarative base."""


class AIDocumentAnalysis(_Base):
    """One row per analyzed document/proposal.

    Mirrors the JSON blob the analyzer engine returns so the original numbers
    remain queryable without parsing JSON for common fields.
    """

    __tablename__ = "ai_document_analysis"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    proposal_id = Column(Integer, ForeignKey("proposal.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    summary = Column(Text, nullable=False)
    keywords = Column(JSONB, nullable=False, default=list)
    overall_score = Column(Float, nullable=False)
    overall_band = Column(String(32), nullable=False)
    evaluation = Column(JSONB, nullable=False)  # full EvaluationReport as JSON
    char_count = Column(Integer, nullable=False, default=0)
    chunk_count = Column(Integer, nullable=False, default=0)
    model = Column(String(128), nullable=False, default="groq-llama3")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    proposal = relationship("DocumentEmbedding", primaryjoin="AIDocumentAnalysis.proposal_id == foreign(Proposal.id)", viewonly=True)
