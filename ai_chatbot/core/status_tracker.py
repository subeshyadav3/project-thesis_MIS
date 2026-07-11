"""In-process status tracker for the analyze pipeline.

Each proposal has a single-step tracker; it sits in this in-process dict so
background tasks can update it as they progress. The HTTP layer exposes it
through ``GET /status/:id``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict

from ..models.schemas import AnalysisStatus, PipelineStage


class _Tracker:
    """Thread-safe-ish in-memory tracker (single-process)."

    for multi-process deployments you would swap this for Redis. For a
    FastAPI service that runs in gunicorn with one worker this is enough.
    """

    def __init__(self) -> None:
        self._store: Dict[int, AnalysisStatus] = {}

    def reset(self, proposal_id: int) -> None:
        self._store[proposal_id] = AnalysisStatus(
            proposal_id=proposal_id,
            stage=PipelineStage.PENDING,
            updated_at=datetime.utcnow(),
        )

    def update(self, proposal_id: int, **kwargs) -> None:
        current = self._store.get(proposal_id)
        if current is None:
            current = AnalysisStatus(proposal_id=proposal_id, stage=PipelineStage.PENDING)
        new = current.model_copy(update={**kwargs, "updated_at": datetime.utcnow()})
        self._store[proposal_id] = new

    def get(self, proposal_id: int) -> AnalysisStatus:
        default = AnalysisStatus(
            proposal_id=proposal_id,
            stage=PipelineStage.PENDING,
        )
        return self._store.get(proposal_id, default)


_tracker = _Tracker()


def get_tracker() -> _Tracker:
    """Return the singleton tracker instance."""
    return _tracker
