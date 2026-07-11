"""RAG chat agent.

Retrieves relevant chunks for the question, builds a context block, and calls
the LLM. Final answer is returned along with the sources used. Provides a
streaming variant for SSE response.
"""

from __future__ import annotations

from typing import AsyncIterator, Dict, List, Optional, Tuple

from .embeddings import embed_text
from .llm_factory import LLMFactory, LLMOutputError, LLMUnavailableError, get_llm_factory
from .logger import get_logger
from .prompts import ANSWER_SYSTEM, ANSWER_USER_TEMPLATE
from .vector_store import query_chunks_text
from ..models.schemas import ChatFinalResponse, ChatSource


logger = get_logger(__name__)


def _format_history(history: List[Dict[str, str]]) -> str:
    """Compact conversation history format. Limit to last 6 turns."""
    if not history:
        return "(none)"
    trimmed = (history or [])[-6:]
    lines: List[str] = []
    for turn in trimmed:
        role = str(turn.get("role") or "user").upper()
        content = str(turn.get("content") or "").strip()
        if content:
            lines.append(f"{role}: {content}")
    return "\n".join(lines) or "(none)"


def _format_context(chunks: List[Dict]) -> Tuple[str, List[Dict]]:
    """Build the numbered context block the prompt expects.

    Returns the formatted context string and the corresponding source list
    (so we can return it to the caller too).
    """
    sources: List[Dict] = []
    if not chunks:
        return "(no context available)", sources

    lines: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        text = (chunk.get("text") or "").strip()
        if not text:
            continue
        page = chunk.get("page")
        snippet = text[:1200]  # cap chunk size in the prompt
        header = f"[{i}]"
        if page:
            header += f" (page {page})"
        lines.append(f"{header}\n{snippet}")
        sources.append({
            "chunk_id": chunk.get("chunk_id"),
            "relevance": float(chunk.get("relevance", 0.0)),
            "snippet": text[:200],
        })
    return "\n\n".join(lines) or "(no context available)", sources


class ChatAgent:
    """Stateless agent. Call repeatedly for each new question."""

    def __init__(self, factory: Optional[LLMFactory] = None):
        self._factory = factory

    def _llm(self) -> LLMFactory:
        if self._factory is None:
            self._factory = get_llm_factory()
        return self._factory

    async def _retrieve(
        self,
        proposal_id: int,
        question: str,
        top_k: Optional[int],
    ) -> List[Dict]:
        from ..core.config import settings  # late import to avoid cycles

        k = top_k or settings.rag_top_k
        try:
            chunks = query_chunks_text(proposal_id, question, top_k=k)
            # Filter out irrelevant chunks for nicer prompts.
            min_rel = settings.rag_min_relevance
            chunks = [c for c in chunks if c.get("relevance", 0.0) >= min_rel]
            return chunks
        except Exception as exc:  # noqa: BLE001
            logger.warning("Retrieval failed for proposal %d: %s", proposal_id, exc)
            return []

    async def ask(
        self,
        *,
        proposal_id: int,
        question: str,
        top_k: Optional[int] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> ChatFinalResponse:
        """Non-streaming answer."""
        chunks = await self._retrieve(proposal_id, question, top_k)
        context, sources = _format_context(chunks)
        history_text = _format_history(history or [])

        user_prompt = ANSWER_USER_TEMPLATE.format(
            context=context,
            question=question,
            history=history_text,
        )
        answer = await self._llm().acomplete(
            system=ANSWER_SYSTEM,
            user=user_prompt,
            temperature=0.2,
            max_tokens=900,
        )

        chat_sources = [
            ChatSource(chunk_id=s["chunk_id"], snippet=s["snippet"], relevance=s["relevance"])
            for s in sources
            if s.get("chunk_id")
        ]
        return ChatFinalResponse(
            proposal_id=proposal_id,
            question=question,
            answer=answer,
            sources=chat_sources,
        )

    async def astream(
        self,
        *,
        proposal_id: int,
        question: str,
        top_k: Optional[int] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[Tuple[str, Optional[ChatFinalResponse]]]:
        """Async generator yielding (delta, None) chunks and a final (None, result) at end."""
        chunks = await self._retrieve(proposal_id, question, top_k)
        context, sources = _format_context(chunks)
        history_text = _format_history(history or [])

        user_prompt = ANSWER_USER_TEMPLATE.format(
            context=context,
            question=question,
            history=history_text,
        )

        collected: List[str] = []
        try:
            async for delta in self._llm().astream(
                system=ANSWER_SYSTEM,
                user=user_prompt,
                temperature=0.2,
                max_tokens=900,
            ):
                collected.append(delta)
                yield (delta, None)
        except LLMUnavailableError:
            yield ("\n\n[LLM is currently unavailable. Showing retrieved chunks instead.]\n\n", None)
            # Show retrieved chunks as fallback.
            for i, c in enumerate(chunks, 1):
                yield (f"[{i}] {(c.get('text') or '')[:600]}\n\n", None)
            collected.append("(LLM unavailable — retrieved chunks above.)")

        answer = "".join(collected).strip()
        chat_sources = [
            ChatSource(chunk_id=s["chunk_id"], snippet=s["snippet"], relevance=s["relevance"])
            for s in sources
            if s.get("chunk_id")
        ]

        yield (
            None,
            ChatFinalResponse(
                proposal_id=proposal_id,
                question=question,
                answer=answer,
                sources=chat_sources,
            ),
        )
