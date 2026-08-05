"""LLM factory — Groq primary, NVIDIA build API fallback.

Both providers are OpenAI-compatible and are used through ``openai``'s
AsyncOpenAI transport. The active provider is chosen with ``LLM_PROVIDER``
in ``ai_chatbot/.env`` ("groq" or "nvidia"); the other is kept as an
automatic fallback when the primary is unreachable, rate-limited, or
rejects the API key.

Keys:
    GROQ_API_KEY      — https://console.groq.com/keys (fast, free tier)
    NVIDIA_API_KEY    — https://build.nvidia.com (fallback)
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


# ──Provider registry ────────────────────────────────────────────────────────

PROVIDERS = ("groq", "nvidia")

# Maps a provider name to the settings attributes it uses.
_PROVIDER_SETTINGS = {
    "groq": {
        "base_url": "groq_base_url",
        "api_key": "groq_api_key",
        "model": "groq_model",
        "temperature": "groq_temperature",
        "max_tokens": "groq_max_tokens",
    },
    "nvidia": {
        "base_url": "nvidia_base_url",
        "api_key": "nvidia_api_key",
        "model": "nvidia_model",
        "temperature": "nvidia_temperature",
        "max_tokens": "nvidia_max_tokens",
    },
}


def _fallback_provider(provider: str) -> Optional[str]:
    """Return the other provider, or None if only one is configured."""
    others = [p for p in PROVIDERS if p != provider]
    return others[0] if others else None


# ──Factory ──────────────────────────────────────────────────────────────────


class LLMFactory:
    """Thin async wrapper around Groq / NVIDIA OpenAI-compatible APIs.

    • Enforces presence of an API key (env: ``GROQ_API_KEY`` / ``NVIDIA_API_KEY``).
    • Centralizes the default model + temperature per provider.
    • Falls back to the other provider once when the primary fails with an
      auth, connection, or rate-limit error.
    • Provides structured JSON helpers.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        fallback: bool = True,
    ):
        self.provider = (provider or settings.llm_provider).lower()
        if self.provider not in PROVIDERS:
            raise LLMAuthError(
                f"Unknown LLM_PROVIDER '{self.provider}'. Use one of: {', '.join(PROVIDERS)}"
            )
        self._fallback_enabled = fallback
        self._cfg = _PROVIDER_SETTINGS[self.provider]

        key = api_key or getattr(settings, self._cfg["api_key"])
        # If the primary key is missing, fall back to the other provider's key
        # so the service still works with whichever one is configured.
        if not key:
            fb = _fallback_provider(self.provider)
            if fb and getattr(settings, _PROVIDER_SETTINGS[fb]["api_key"]):
                self.provider = fb
                self._cfg = _PROVIDER_SETTINGS[fb]
                key = getattr(settings, self._cfg["api_key"])
                logger.warning("No key for primary provider, using %s instead", fb)

        self.api_key = key
        self.model = model or getattr(settings, self._cfg["model"])
        if not self.api_key:
            raise LLMAuthError(
                "No LLM API key configured. Set GROQ_API_KEY and/or NVIDIA_API_KEY "
                "in ai_chatbot/.env."
            )

    def _client_for(self, provider: str) -> AsyncOpenAI:
        cfg = _PROVIDER_SETTINGS[provider]
        return AsyncOpenAI(
            api_key=getattr(settings, cfg["api_key"]) or self.api_key,
            base_url=getattr(settings, cfg["base_url"]),
            timeout=settings.llm_request_timeout,
            max_retries=0,
        )

    def _temp(self, temperature: Optional[float]) -> float:
        return temperature if temperature is not None else getattr(settings, self._cfg["temperature"])

    def _max_tokens(self, max_tokens: Optional[int]) -> int:
        return max_tokens if max_tokens is not None else getattr(settings, self._cfg["max_tokens"])

    def _swap_to_fallback(self) -> bool:
        """Switch this factory to the fallback provider. Returns False if none."""
        fb = _fallback_provider(self.provider)
        if not fb or not self._fallback_enabled:
            return False
        self.provider = fb
        self._cfg = _PROVIDER_SETTINGS[fb]
        self.model = getattr(settings, self._cfg["model"])
        if not getattr(settings, self._cfg["api_key"]):
            return False
        logger.warning("LLM provider switched to fallback '%s' (model %s)", fb, self.model)
        return True

    @staticmethod
    def _map_error(provider: str, exc: BaseException, model: str) -> BaseException:
        if isinstance(exc, AuthenticationError):
            return LLMAuthError(f"{provider} API key rejected: {exc}")
        if isinstance(exc, NotFoundError):
            return LLMAuthError(f"{provider} model '{model}' not found: {exc}")
        if isinstance(exc, (APIConnectionError, APIError, RateLimitError)):
            return LLMUnavailableError(f"{provider} unavailable: {exc}")
        return exc

    async def _run_once(
        self, kwargs: Dict[str, Any], *, stream: bool
    ):
        client = self._client_for(self.provider)
        kwargs["model"] = self.model
        kwargs["temperature"] = self._temp(kwargs.get("temperature"))
        kwargs["max_tokens"] = self._max_tokens(kwargs.get("max_tokens"))
        try:
            return await client.chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 — normalized below
            mapped = self._map_error(self.provider, exc, self.model)
            raise mapped from exc

    async def _run_with_fallback(self, kwargs: Dict[str, Any], *, stream: bool):
        """Execute once on the primary provider; retry once on the fallback."""
        try:
            return await self._run_once(kwargs, stream=stream)
        except (LLMAuthError, LLMUnavailableError) as exc:
            if not self._swap_to_fallback():
                raise
            logger.warning(
                "Falling back to provider '%s' after primary failed: %s", self.provider, exc
            )
            try:
                return await self._run_once(kwargs, stream=stream)
            except (LLMAuthError, LLMUnavailableError) as exc2:
                raise exc2 from exc

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
        kwargs: Dict[str, Any] = {
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        if stop:
            kwargs["stop"] = stop

        try:
            resp = await self._run_with_fallback(kwargs, stream=False)
        except LLMUnavailableError:
            raise
        except LLMAuthError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise LLMUnavailableError(f"{self.provider} API error: {exc}") from exc

        try:
            message = resp.choices[0].message
            content = getattr(message, "content", None) if message else None
        except (IndexError, AttributeError) as exc:
            raise LLMOutputError(f"Unexpected {self.provider} response shape: {exc}") from exc

        if not content or not content.strip():
            raise LLMOutputError(f"{self.provider} returned empty content.")
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
        kwargs: Dict[str, Any] = {
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        try:
            stream = await self._run_with_fallback(kwargs, stream=True)
        except LLMUnavailableError:
            raise
        except LLMAuthError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise LLMUnavailableError(f"{self.provider} API error: {exc}") from exc

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
    """Return a LangChain-compatible LLM for the configured primary provider.

    Used by the legacy LangGraph agents (ask_agent, marker, summarizer).
    Groq is preferred when ``LLM_PROVIDER=groq`` (and langchain-groq is
    installed); otherwise it falls back to NVIDIA.
    """
    if settings.llm_provider == "groq":
        try:
            from langchain_groq import ChatGroq

            if not settings.groq_api_key:
                raise LLMAuthError("GROQ_API_KEY is not configured.")
            return ChatGroq(
                model=settings.groq_model,
                api_key=settings.groq_api_key,
                temperature=settings.groq_temperature,
                max_tokens=settings.groq_max_tokens,
            )
        except ImportError:
            logger.warning(
                "langchain-groq not installed — falling back to NVIDIA for agents"
            )

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
