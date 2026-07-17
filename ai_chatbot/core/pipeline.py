"""End-to-end pipeline orchestration:

    fetch → extract → clean → chunk → embed → store → analyze → persist

Steps are chained as async coroutines so they don't block the FastAPI event
loop. Errors from any step are captured, persisted as a FAILED status, and
re-raised so the caller can mark the request accordingly.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .analysis_repository import fetch_analysis, notify_backend_status, upsert_analysis
from .analyzer import DocumentAnalyzer, fallback_analysis
from .chat_agent import ChatAgent
from .embeddings import embed_texts, embedding_dim_for
from .logger import get_logger
from .pdf_processor import (
    PDFFetchError,
    PDFParseError,
    ProcessedDocument,
    fetch_document_bytes,
    process_pdf_async,
)
from .status_tracker import get_tracker
from .vector_store import collection_count, delete_proposal_chunks, store_chunks
from ..models.schemas import (
    AnalysisStatus,
    ChatFinalResponse,
    DocumentAnalysis,
    PipelineStage,
)


logger = get_logger(__name__)


class PipelineError(RuntimeError):
    """Top-level pipeline error."""


class Pipeline:
    """Runs the full analysis pipeline for one proposal/document."""

    def __init__(self, analyzer: Optional[DocumentAnalyzer] = None):
        self.analyzer = analyzer or DocumentAnalyzer()
        self.tracker = get_tracker()

    # ──Helpers ────────────────────────────────────────────────────────────
    def _update(self, proposal_id: int, **kwargs) -> None:
        self.tracker.update(proposal_id, **kwargs)
        logger.debug("Pipeline status for proposal %d: %s", proposal_id, kwargs)

    # ──Step 1: fetch the document ────────────────────────────────────────
    async def _fetch(
        self,
        *,
        proposal_id: int,
        document_url: str,
        auth_token: Optional[str],
    ) -> bytes:
        self._update(proposal_id, stage=PipelineStage.FETCHING)
        try:
            return await fetch_document_bytes(document_url, auth_token=auth_token)
        except PDFFetchError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise PipelineError(f"Fetch failed: {exc}") from exc

    # ──Step 2–4: extract, clean, chunk ────────────────────────────────────
    async def _process(self, pdf_bytes: bytes, *, proposal_id: int) -> ProcessedDocument:
        self._update(proposal_id, stage=PipelineStage.EXTRACTING)
        try:
            doc = await process_pdf_async(pdf_bytes)
        except PDFParseError as exc:
            raise PipelineError(f"PDF parsing failed: {exc}") from exc
        except Exception as exc:  # noqa: BLE001
            raise PipelineError(f"Processing failed: {exc}") from exc

        self._update(
            proposal_id,
            stage=PipelineStage.CLEANING,
            char_count=doc.char_count,
        )
        self._update(
            proposal_id,
            stage=PipelineStage.CHUNKING,
            char_count=doc.char_count,
            chunk_count=doc.chunk_count,
        )
        return doc

    # ──Step 5-6: embed + store ────────────────────────────────────────────
    def _embed_and_store(self, doc: ProcessedDocument, *, proposal_id: int) -> List[List[float]]:
        self._update(proposal_id, stage=PipelineStage.EMBEDDING)
        chunk_texts: List[str] = [c.text for c in doc.chunks]
        if not chunk_texts:
            return []

        vectors = embed_texts(chunk_texts, normalize=True)

        self._update(proposal_id, stage=PipelineStage.STORING)
        metadata = [{"index": c.index} for c in doc.chunks]
        store_chunks(proposal_id=proposal_id, chunk_texts=chunk_texts, chunk_vectors=vectors, metadata=metadata)
        return vectors

    # ──Step 7: analyze via LLM ────────────────────────────────────────────
    async def _analyze(
        self,
        doc: ProcessedDocument,
        *,
        proposal_id: int,
        vectors: List[List[float]],
    ) -> DocumentAnalysis:
        self._update(proposal_id, stage=PipelineStage.ANALYZING)
        try:
            analysis = await self.analyzer.analyze(doc)
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM analysis failed: %s", exc)
            analysis = fallback_analysis(doc, error=str(exc))
        return analysis

    # ──Step 8: persist ───────────────────────────────────────────────────
    async def _persist(
        self,
        *,
        proposal_id: int,
        document_type: str,
        doc: ProcessedDocument,
        vectors: List[List[float]],
        analysis: DocumentAnalysis,
    ) -> None:
        evaluation_dict = analysis.evaluation.model_dump(mode="json")
        avg_vector = _average_vector(vectors)

        try:
            await upsert_analysis(
                proposal_id=proposal_id,
                summary=analysis.summary,
                keywords=analysis.keywords,
                overall_score=analysis.evaluation.overall_score,
                overall_band=analysis.evaluation.overall_band.value,
                evaluation=evaluation_dict,
                char_count=doc.char_count,
                chunk_count=doc.chunk_count,
            )
        except Exception as exc:  # noqa: BLE001
            # Persistence to PG failed — backend push still happens so the
            # frontend isn't blocked.
            logger.warning("PG persistence failed for proposal %d: %s", proposal_id, exc)

        # Best-effort backend notification.
        await notify_backend_status(
            proposal_id=proposal_id,
            status="OK",
            vector=avg_vector,
            char_count=doc.char_count,
            chunk_count=doc.chunk_count,
            summary_text=analysis.summary,
            evaluation=evaluation_dict,
            document_type=document_type,
        )

    # ──Driver ─────────────────────────────────────────────────────────────
    async def run(
        self,
        *,
        proposal_id: int,
        document_url: str,
        document_type: str = "PROPOSAL",
        auth_token: Optional[str] = None,
        force: bool = False,
    ) -> DocumentAnalysis:
        """Execute the full pipeline."""
        self.tracker.reset(proposal_id)
        try:
            pdf = await self._fetch(
                proposal_id=proposal_id,
                document_url=document_url,
                auth_token=auth_token,
            )
            doc = await self._process(pdf, proposal_id=proposal_id)
            vectors = self._embed_and_store(doc, proposal_id=proposal_id)
            analysis = await self._analyze(doc, proposal_id=proposal_id, vectors=vectors)
            await self._persist(
                proposal_id=proposal_id,
                document_type=document_type,
                doc=doc,
                vectors=vectors,
                analysis=analysis,
            )
            self._update(
                proposal_id,
                stage=PipelineStage.COMPLETED,
                char_count=doc.char_count,
                chunk_count=doc.chunk_count,
            )
            logger.info(
                "Pipeline completed for proposal %d (chunks=%d, score=%.1f)",
                proposal_id,
                doc.chunk_count,
                analysis.evaluation.overall_score,
            )
            return analysis
        except Exception as exc:  # noqa: BLE001
            self._update(
                proposal_id,
                stage=PipelineStage.FAILED,
                error=str(exc)[:250],
            )
            # Still notify the backend of failure so the UI shows it.
            await notify_backend_status(proposal_id=proposal_id, status="FAILED")
            raise PipelineError(f"Pipeline failed: {exc}") from exc


# ──Helpers ─────────────────────────────────────────────────────────────────


def _average_vector(vectors: List[List[float]]) -> List[float]:
    if not vectors:
        return []
    dim = len(vectors[0])
    sums = [0.0] * dim
    for v in vectors:
        for i, val in enumerate(v):
            sums[i] += val
    return [s / len(vectors) for s in sums]


def get_status(proposal_id: int) -> AnalysisStatus:
    return get_tracker().get(proposal_id)


def has_stored_analysis(proposal_id: int) -> bool:
    return collection_count(proposal_id) > 0
