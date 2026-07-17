"""LLM factory — NVIDIA build API (OpenAI-compatible) client.

Uses ``integrate.api.nvidia.com/v1`` as the upstream, with ``openai``'s
AsyncOpenAI as the transport. All models in the NVIDIA catalog are listed at
https://build.nvidia.com/explore/discover (and ``GET https://integrate.api.nvidia.com/v1/models``).

Set ``NVIDIA_API_KEY`` (preferred) or ``OPENAI_API_KEY`` as the key. ``model``
defaults to ``meta/llama-3.1-70b-instruct``, which is OpenAI-compatible and
currently supported — override via ``NVIDIA_MODEL``.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Mapping, Optional

from openai import (
    APIConnectionError,
    APIError,
    AsyncOpenAI,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
)

from .config import settings
from .logger import get_logger


logger = get_logger(__name__)


# ──Exception surface (kept Groq-compatible so existing callers keep working) ──


class LLMAuthError(RuntimeError):
    """Raised when the API key is missing/invalid. Mapped to HTTP 401/503."""


class LLMUnavailableError(RuntimeError):
    """Raised when the upstream LLM cannot be reached. Mapped to HTTP 502."""


class LLMOutputError(RuntimeError):
    """Raised when the model returns malformed output that we cannot parse."""


# ──Factory ──────────────────────────────────────────────────────────────────


class LLMFactory:
    """Thin async wrapper around the NVIDIA build API.

    • Enforces presence of an API key (env: ``NVIDIA_API_KEY``).
    • Centralizes the default model + temperature.
    • Provides structured JSON helpers.
    • Handles retries / connection-failure mapping consistently.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.nvidia_api_key
        self.model = model or settings.nvidia_model
        if not self.api_key:
            raise LLMAuthError(
                "NVIDIA_API_KEY is not configured. Set it in ai_chatbot/.env."
            )

    @property
    def provider(self) -> str:
        return "nvidia-build"

    # ──Client construction ────────────────────────────────────────────────
    def _client(self) -> AsyncOpenAI:
        return AsyncOpenAI(
            api_key=self.api_key,
            base_url=settings.nvidia_base_url,
            timeout=settings.llm_request_timeout,
            max_retries=0,
        )

    # ──Plain completion ───────────────────────────────────────────────────
    async def acomplete(
        self,
        system: str,
        user: str,
        *,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
    ) -> str:
        """Return raw text content. Strips trailing whitespace."""
        client = self._client()
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": (
                temperature if temperature is not None else settings.nvidia_temperature
            ),
            "max_tokens": (
                max_tokens if max_tokens is not None else settings.nvidia_max_tokens
            ),
            "stream": False,
        }
        if stop:
            kwargs["stop"] = stop

        try:
            resp = await client.chat.completions.create(**kwargs)
        except AuthenticationError as exc:
            raise LLMAuthError(f"NVIDIA API key rejected: {exc}") from exc
        except NotFoundError as exc:
            # Most common cause: decommissioned/typo'd model name.
            raise LLMAuthError(
                f"NVIDIA model '{self.model}' not found. Set NVIDIA_MODEL to a currently "
                f"supported one (see https://build.nvidia.com/explore/discover). Detail: {exc}"
            ) from exc
        except APIConnectionError as exc:
            raise LLMUnavailableError(f"NVIDIA connection failed: {exc}") from exc
        except RateLimitError as exc:
            raise LLMUnavailableError(f"NVIDIA rate-limited: {exc}") from exc
        except APIError as exc:
            raise LLMUnavailableError(f"NVIDIA API error: {exc}") from exc

        try:
            message = resp.choices[0].message
            content = getattr(message, "content", None) if message else None
        except (IndexError, AttributeError) as exc:
            raise LLMOutputError(f"Unexpected NVIDIA response shape: {exc}") from exc

        if not content or not content.strip():
            raise LLMOutputError("NVIDIA returned empty content.")
        return content.strip()

    # ──Structured JSON ────────────────────────────────────────────────────
    async def acomplete_json(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        retry_on_fail: int = 2,
    ) -> Dict[str, Any]:
        """Like ``acomplete`` but forces a JSON object and parses it."""
        json_hint = (
            "\n\nReturn ONLY a JSON object. No prose, no markdown. "
            "Keys must exactly match what the schema asks for."
        )
        last_err: Optional[BaseException] = None
        for attempt in range(retry_on_fail + 1):
            try:
                raw = await self.acomplete(
                    system=system + json_hint,
                    user=user,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return _coerce_json(raw)
            except LLMOutputError as exc:
                last_err = exc
                logger.warning(
                    "JSON parse failed (attempt %d/%d): %s",
                    attempt + 1,
                    retry_on_fail + 1,
                    exc,
                )
                await asyncio.sleep(0.5 * (attempt + 1))
        raise LLMOutputError(f"Could not parse LLM output as JSON: {last_err}")

    # ──Streaming completion ───────────────────────────────────────────────
    async def astream(
        self,
        system: str,
        user: str,
        *,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        """Yield content chunks as they arrive. Used by /chat streaming."""
        client = self._client()
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": (
                temperature if temperature is not None else settings.nvidia_temperature
            ),
            "max_tokens": (
                max_tokens if max_tokens is not None else settings.nvidia_max_tokens
            ),
            "stream": True,
        }

        try:
            stream = await client.chat.completions.create(**kwargs)
        except AuthenticationError as exc:
            raise LLMAuthError(f"NVIDIA API key rejected: {exc}") from exc
        except NotFoundError as exc:
            raise LLMAuthError(
                f"NVIDIA model '{self.model}' not found: {exc}"
            ) from exc
        except APIConnectionError as exc:
            raise LLMUnavailableError(f"NVIDIA connection failed: {exc}") from exc
        except APIError as exc:
            raise LLMUnavailableError(f"NVIDIA API error: {exc}") from exc

        async for chunk in stream:
            try:
                delta = chunk.choices[0].delta.content
            except (IndexError, AttributeError):
                delta = None
            if delta:
                yield delta


# ──Helpers ──────────────────────────────────────────────────────────────────


def _coerce_json(raw: str) -> Mapping[str, Any]:
    """Strip markup and JSON-decode. Falls back to extracting the largest {...}."""
    text = raw.strip()

    # Strip ```json ... ``` fences if present.
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        if "```" in text:
            text = text.split("```", 1)[0]

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find the first {...} block balanced.
    start = text.find("{")
    while start != -1:
        depth = 0
        for i in range(start, len(text)):
            ch = text[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = text[start : i + 1]
                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        break
        start = text.find("{", start + 1)

    raise LLMOutputError(
        f"No parseable JSON object found in LLM output of length {len(raw)}"
    )


# ──Default singleton ────────────────────────────────────────────────────────


_default_factory: Optional[LLMFactory] = None


def get_llm_factory() -> LLMFactory:
    """Lazy default — created on first call. None of the modules import this at
    module-load time, so a missing key does not crash the server until first use.
    """
    global _default_factory
    if _default_factory is None:
        _default_factory = LLMFactory()
    return _default_factory


def get_llm():
    """Return a LangChain-compatible LLM backed by the NVIDIA API.

    Used by the legacy LangGraph agents (ask_agent, marker, summarizer).
    Falls back gracefully if langchain-nvidia-ai-endpoints is not installed.
    """
    try:
        from langchain_nvidia_ai_endpoints import ChatNVIDIA
    except ImportError:
        raise RuntimeError(
            "langchain-nvidia-ai-endpoints is required for LangGraph agents. "
            "Run: pip install -r ai_chatbot/requirements.txt"
        )

    key = settings.nvidia_api_key
    if not key:
        raise LLMAuthError("NVIDIA_API_KEY is not configured.")

    return ChatNVIDIA(
        model=settings.nvidia_model,
        api_key=key,
        base_url=settings.nvidia_base_url,
        temperature=settings.nvidia_temperature,
        max_tokens=settings.nvidia_max_tokens,
    )
