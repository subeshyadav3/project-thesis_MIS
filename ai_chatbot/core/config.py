"""Configuration module for the AI chatbot service.

Loads environment variables from the parent .env file (or a local one)
and exposes a typed Settings object.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve the project root (this file lives at ai_chatbot/core/config.py -> up two levels).
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Environment variables override defaults. Keeping this typed makes the
    dependencies explicit at call-sites instead of scattered os.getenv calls.
    """

    # ──Service ───────────────────────────────────────────────────────────
    service_name: str = "ai_chatbot"
    service_title: str = "TPMS AI Chatbot"
    api_prefix: str = "/api/ai"
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: str = "INFO"
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5000",
    ]

    # ──Environment files ─────────────────────────────────────────────────
    # Look in ai_chatbot/.env first, then fall back to project root .env.
    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / "ai_chatbot" / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ──Backend (Express) bridge ──────────────────────────────────────────
    backend_base_url: str = Field(default="http://localhost:5000")
    backend_internal_token: str = Field(default="")
    backend_request_timeout: int = 30

    # ──Database (PostgreSQL) ─────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/thesis_management"
    )
    db_echo: bool = False
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # ──LLM (Groq - Llama 3) ──────────────────────────────────────────────
    groq_api_key: str = Field(default="")
    groq_model: str = Field(default="llama-3.1-70b-versatile")
    groq_temperature: float = 0.2
    groq_max_tokens: int = 2048
    llm_request_timeout: int = 120

    # ──Embedding model (local sentence-transformers) ─────────────────────
    embedding_model_name: str = Field(default="BAAI/bge-small-en-v1.5")
    embedding_device: str = Field(default="cpu")
    embedding_batch_size: int = 16
    embedding_dim: int = 384

    # ──Document processing ──────────────────────────────────────────────
    chunk_size: int = 800
    chunk_overlap: int = 120
    max_pdf_pages: int = 200
    max_text_chars: int = 200_000

    # ──ChromaDB vector store ─────────────────────────────────────────────
    chroma_persist_dir: str = Field(default=str(_PROJECT_ROOT / "ai_chatbot" / "vector_store"))
    chroma_collection_name: str = Field(default="tpms_documents")

    # ──Pipeline behaviour ───────────────────────────────────────────────
    enable_auto_summarize: bool = True
    enable_auto_evaluate: bool = True
    embedding_max_retries: int = 3
    embedding_retry_delay: float = 2.0

    # ──RAG / Q&A ─────────────────────────────────────────────────────────
    rag_top_k: int = 4
    rag_min_relevance: float = 0.15


def get_settings() -> Settings:
    """Factory cached by lru_cache in deps.py. Kept as a small wrapper for DI."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
