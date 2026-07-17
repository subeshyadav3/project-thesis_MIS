"""Document analyzer.

Runs the LLM in a single call that returns summary + keywords + evaluation,
maps raw output into typed Pydantic models, and provides a safe fallback if
the JSON cannot be parsed.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Mapping, Optional

from .embeddings import embedding_dim_for
from .llm_factory import LLMFactory, LLMOutputError, LLMUnavailableError, get_llm_factory
from .logger import get_logger
from .pdf_processor import ProcessedDocument
from .prompts import ANALYSIS_SYSTEM, ANALYSIS_USER_TEMPLATE
from ..models.schemas import (
    CriterionScore,
    DocumentAnalysis,
    EvaluationReport,
    ScoreBand,
)


logger = get_logger(__name__)


# ──Score-band logic ────────────────────────────────────────────────────────


def _band_for(score: float) -> ScoreBand:
    if score >= 9.0:
        return ScoreBand.EXCELLENT
    if score >= 7.5:
        return ScoreBand.STRONG
    if score >= 5.5:
        return ScoreBand.ADEQUATE
    if score >= 3.5:
        return ScoreBand.WEAK
    return ScoreBand.POOR


def _round_score(value: float) -> float:
    return max(0.0, min(10.0, round(float(value), 1)))


# ──Mapping ─────────────────────────────────────────────────────────────────


def _map_criteria(items: List[Mapping[str, Any]]) -> List[CriterionScore]:
    out: List[CriterionScore] = []
    for raw in items:
        try:
            score = _round_score(float(raw.get("score", 0)))
            reason = str(raw.get("reason") or "").strip() or "No reason provided."
            evidence = raw.get("evidence")
            out.append(
                CriterionScore(
                    key=str(raw.get("key") or "").strip().lower().replace(" ", "_"),
                    label=str(raw.get("label") or raw.get("key") or "Criterion").strip(),
                    score=score,
                    band=_band_for(score),
                    reason=reason,
                    evidence=str(evidence).strip() if evidence else None,
                )
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Skipping malformed criterion %r: %s", {k: raw.get(k) for k in ("key", "score")}, exc)
    return out


def _coerce_analysis(payload: Mapping[str, Any], doc: ProcessedDocument) -> DocumentAnalysis:
    """Map raw LLM JSON output into the typed ``DocumentAnalysis`` shape.

    Resilient: missing fields get sensible defaults instead of crashing.
    """
    summary = str(payload.get("summary") or "").strip() or "Summary unavailable."
    keywords_raw = payload.get("keywords") or []
    keywords: List[str] = []
    if isinstance(keywords_raw, list):
        for k in keywords_raw[:12]:
            if isinstance(k, str) and k.strip():
                keywords.append(k.strip())
            elif isinstance(k, dict):
                # tolerate {"term": "x"} shape
                value = next(iter(k.values()), None)
                if value:
                    keywords.append(str(value).strip())

    criteria = _map_criteria(list(payload.get("criteria") or []))
    if not criteria:
        # The model failed to emit criteria — synthesize zero-scored placeholders so
        # downstream code still has a report.
        criteria = [
            CriterionScore(
                key="uniqueness", label="Uniqueness", score=0.0,
                band=ScoreBand.POOR, reason="No criterion output from the model.",
            ),
            CriterionScore(
                key="technical_depth", label="Technical Depth", score=0.0,
                band=ScoreBand.POOR, reason="No criterion output from the model.",
            ),
            CriterionScore(
                key="practicality", label="Practicality", score=0.0,
                band=ScoreBand.POOR, reason="No criterion output from the model.",
            ),
            CriterionScore(
                key="clarity", label="Clarity", score=0.0,
                band=ScoreBand.POOR, reason="No criterion output from the model.",
            ),
        ]

    overall = _round_score(
        float(payload.get("overall_score") or sum(c.score for c in criteria) / len(criteria))
    )

    overall_summary = str(payload.get("summary_overall") or "").strip() or (
        "Overall evaluation pending — see per-criterion reasons above."
    )

    report = EvaluationReport(
        overall_score=overall,
        overall_band=_band_for(overall),
        criteria=criteria,
        summary=overall_summary,
    )

    return DocumentAnalysis(
        summary=summary,
        keywords=keywords,
        evaluation=report,
        char_count=doc.char_count,
        chunk_count=doc.chunk_count,
        analyzed_at=datetime.utcnow(),
    )


# ──Public driver ────────────────────────────────────────────────────────────


class DocumentAnalyzer:
    """Run a single end-to-end analysis pass."""

    def __init__(self, factory: Optional[LLMFactory] = None):
        self._factory = factory

    def _llm(self) -> LLMFactory:
        if self._factory is None:
            self._factory = get_llm_factory()
        return self._factory

    async def analyze(
        self,
        document: ProcessedDocument,
        *,
        max_chars_for_prompt: int = 18_000,
    ) -> DocumentAnalysis:
        """Run analysis. Truncates text fed to the model to keep tokens sane."""
        text = document.cleaned_text or document.raw_text
        if len(text) > max_chars_for_prompt:
            text = text[:max_chars_for_prompt]

        user_prompt = ANALYSIS_USER_TEMPLATE.format(document_text=text)
        payload = await self._llm().acomplete_json(
            system=ANALYSIS_SYSTEM,
            user=user_prompt,
            temperature=0.2,
            max_tokens=1600,
            retry_on_fail=2,
        )

        return _coerce_analysis(payload, document)


# ──Lightweight fallback used when LLM is unavailable ──────────────────────


def fallback_analysis(document: ProcessedDocument, *, error: str) -> DocumentAnalysis:
    """Deterministic placeholder output.

    Keeps the pipeline alive even if Groq is down: we still surface an empty
    but well-typed analysis plus an error string in the report summary.
    """
    empty = EvaluationReport(
        overall_score=0.0,
        overall_band=ScoreBand.POOR,
        criteria=[
            CriterionScore(key="uniqueness", label="Uniqueness", score=0.0, band=ScoreBand.POOR, reason=error),
            CriterionScore(key="technical_depth", label="Technical Depth", score=0.0, band=ScoreBand.POOR, reason=error),
            CriterionScore(key="practicality", label="Practicality", score=0.0, band=ScoreBand.POOR, reason=error),
            CriterionScore(key="clarity", label="Clarity", score=0.0, band=ScoreBand.POOR, reason=error),
        ],
        summary=f"Analysis unavailable: {error}",
    )
    return DocumentAnalysis(
        summary=f"Analysis unavailable: {error}",
        keywords=[],
        evaluation=empty,
        char_count=document.char_count,
        chunk_count=document.chunk_count,
        analyzed_at=datetime.utcnow(),
    )
