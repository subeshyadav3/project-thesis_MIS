"""LLM factory — Groq Llama 3 client with structured error handling."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Mapping, Optional

from groq import AsyncGroq, APIError, APIConnectionError, RateLimitError

from .config import settings
from .logger import get_logger


logger = get_logger(__name__)


class LLMAuthError(RuntimeError):
    """Raised when the API key is missing/invalid. Mapped to HTTP 401/503."""


class LLMUnavailableError(RuntimeError):
    """Raised when the upstream LLM cannot be reached. Mapped to HTTP 502."""


class LLMOutputError(RuntimeError):
    """Raised when the model returns malformed output that we cannot parse."""


class LLMFactory:
    """Thin wrapper that:

    • enforces presence of the API key,
    • centralizes the default model + temperature,
    • provides structured JSON helpers,
    • handles retries / connection-failure mapping consistently.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.groq_api_key
        self.model = model or settings.groq_model
        if not self.api_key:
            raise LLMAuthError("GROQ_API_KEY is not configured. Set it in ai_chatbot/.env.")

    # ──Client construction ────────────────────────────────────────────────
    def _client(self) -> AsyncGroq:
        return AsyncGroq(api_key=self.api_key, timeout=settings.llm_request_timeout)

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
        try:
            resp = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature if temperature is not None else settings.groq_temperature,
                max_tokens=max_tokens if max_tokens is not None else settings.groq_max_tokens,
                stop=stop,
            )
        except APIConnectionError as exc:
            raise LLMUnavailableError(f"LLM connection failed: {exc}") from exc
        except RateLimitError as exc:
            raise LLMUnavailableError(f"LLM rate-limited: {exc}") from exc
        except APIError as exc:
            raise LLMUnavailableError(f"LLM API error: {exc}") from exc

        content: Optional[str] = resp.choices[0].message.content if resp.choices else None
        if not content or not content.strip():
            raise LLMOutputError("LLM returned empty content.")
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
        """Like ``acomplete`` but forces a JSON object and parses it.

        Asks the model to wrap output in fenced ```json codeblocks and tolerates
        minor preamble. Falls back to coerce raw arrays or trimmed txt.
        """
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
                logger.warning("JSON parse failed (attempt %d/%d): %s", attempt + 1, retry_on_fail + 1, exc)
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
        try:
            stream = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature if temperature is not None else settings.groq_temperature,
                max_tokens=max_tokens if max_tokens is not None else settings.groq_max_tokens,
                stream=True,
            )
        except APIConnectionError as exc:
            raise LLMUnavailableError(f"LLM connection failed: {exc}") from exc
        except APIError as exc:
            raise LLMUnavailableError(f"LLM API error: {exc}") from exc

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
        # Drop language tags and trailing fence.
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

    raise LLMOutputError(f"No parseable JSON object found in LLM output of length {len(raw)}")


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
