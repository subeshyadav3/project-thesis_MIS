"""Database engine + session factory.

Built with SQLAlchemy core for async execution. The same async engine powers
both the AI service writes (analysis results) and supports future migration
away from the Express-side docstore.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from ..core.config import settings
from ..core.logger import get_logger


logger = get_logger(__name__)


# ──Engine ──────────────────────────────────────────────────────────────────
# Convert sync psycopg URL -> asyncpg URL automatically.
def _to_async_url(sync_url: str) -> str:
    if sync_url.startswith("postgresql+psycopg2://"):
        return sync_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    if sync_url.startswith("postgresql://"):
        return sync_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if sync_url.startswith("postgres://"):
        return sync_url.replace("postgres://", "postgresql+asyncpg://", 1)
    return sync_url


_async_url = _to_async_url(settings.database_url)
_async_url = _async_url.replace("postgresql+asyncpg+asyncpg://", "postgresql+asyncpg://")


_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> AsyncEngine:
    """Lazily build the async engine. Re-used across the app lifetime."""
    global _engine, _session_factory
    if _engine is None:
        logger.info("Creating async SQLAlchemy engine (pool=%s, overflow=%s)", settings.db_pool_size, settings.db_max_overflow)
        _engine = create_async_engine(
            _async_url,
            echo=settings.db_echo,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_pre_ping=True,
        )
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        get_engine()
    assert _session_factory is not None
    return _session_factory


async def ping_database() -> bool:
    """Quick connectivity probe — used by /health."""
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            from sqlalchemy import text  # local import to avoid cycles
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("DB ping failed: %s", exc)
        return False


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Async context manager yielding a transactional session.

    Auto-rolls back on exception; closes the session either way.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
