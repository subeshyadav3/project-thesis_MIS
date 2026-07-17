"""Structured logging configured once and reused across the service."""

from __future__ import annotations

import logging
import sys

from .config import settings


def configure_logging() -> None:
    """Initialize the root logger once.

    Idempotent: safe to call multiple times (e.g. from tests) without
    duplicating handlers.
    """
    root = logging.getLogger()
    if getattr(root, "_tpms_configured", False):
        return

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())
    root._tpms_configured = True  # type: ignore[attr-defined]


def get_logger(name: str) -> logging.Logger:
    """Return a child logger with the standard configuration."""
    configure_logging()
    return logging.getLogger(name)
