"""Dependency-injection helpers for FastAPI routes."""

from __future__ import annotations

from typing import Optional

from fastapi import Header

from ..core.analyzer import DocumentAnalyzer
from ..core.chat_agent import ChatAgent
from ..core.config import settings
from ..core.pipeline import Pipeline


_pipeline: Optional[Pipeline] = None
_chat: Optional[ChatAgent] = None
_analyzer: Optional[DocumentAnalyzer] = None


def get_pipeline() -> Pipeline:
    """Return a memoized Pipeline."""
    global _pipeline
    if _pipeline is None:
        _pipeline = Pipeline(analyzer=get_analyzer())
    return _pipeline


def get_chat_agent() -> ChatAgent:
    global _chat
    if _chat is None:
        _chat = ChatAgent()
    return _chat


def get_analyzer() -> DocumentAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = DocumentAnalyzer()
    return _analyzer


async def resolve_auth_token(authorization: Optional[str] = Header(default=None)) -> Optional[str]:
    """Extract the bearer token from the Authorization header, if present.

    Used to forward the JWT to the backend when fetching the uploaded PDF,
    so the backend authorization policy is respected.
    """
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None
