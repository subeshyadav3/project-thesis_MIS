"""FastAPI entry point for the TPMS AI Chatbot service."""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from ai_chatbot.app.router import router  # noqa: E402
from ai_chatbot.core.config import settings  # noqa: E402
from ai_chatbot.core.logger import configure_logging, get_logger  # noqa: E402


logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger.info(
        "Starting %s (host=%s port=%s)",
        settings.service_title,
        settings.host,
        settings.port,
    )
    logger.info("Backend URL: %s", settings.backend_base_url)
    logger.info("Vector store: %s", settings.chroma_persist_dir)
    logger.info("LLM provider: %s (model=%s)", settings.nvidia_base_url, settings.nvidia_model)
    yield
    logger.info("Shutting down %s", settings.service_title)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.service_title,
        version="1.0.0",
        lifespan=lifespan,
        description=(
            "AI assistant microservice for the TPMS Thesis/Project Management "
            "System. Exposed through the Express backend via /api/ai/* proxies."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error in AI service: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal AI service error", "detail": str(exc)},
        )

    app.include_router(router, prefix=settings.api_prefix)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "ai_chatbot.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
        reload=bool(int(os.getenv("RELOAD", "0"))),
    )
