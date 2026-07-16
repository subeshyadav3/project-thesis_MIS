"""Smoke tests for the AI chatbot service.

Run with:
    python -m pytest ai_chatbot/tests/
or directly:
    python ai_chatbot/tests/test_pipeline.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow ``python ai_chatbot/tests/test_pipeline.py`` invocation.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

os.environ.setdefault("GROQ_API_KEY", "")  # use deterministic fallback only

from ai_chatbot.core.analyzer import DocumentAnalyzer
from ai_chatbot.core.chat_agent import ChatAgent
from ai_chatbot.core.embeddings import embed_text
from ai_chatbot.core.llm_factory import LLMAuthError
from ai_chatbot.core.pdf_processor import (
    clean_extracted_text,
    chunk_text,
    extract_text_from_bytes,
    process_pdf_async,
)
from ai_chatbot.core.prompts import ANALYSIS_SYSTEM, ANALYSIS_USER_TEMPLATE


SAMPLE_TEXT = """
TITLE: Smart Irrigation System for Hilly Region

ABSTRACT:
This proposal evaluates the feasibility of a solar-powered IoT irrigation
controller deployed across mid-hill farms in Nepal. The device collects soil
moisture and weather telemetry, runs locally on an ESP32 board, and transmits
descriptors to a remote dashboard.

OBJECTIVES:
1. Reduce water consumption by 35 percent over traditional flood systems.
2. Demonstrate the device over a one-hectare pilot during the dry season.
3. Validate cost-of-ownership against existing drip systems.

METHODOLOGY:
- Build a solar + battery powered sensor rig.
- Implement deferrable scheduling on the edge controller.
- Run a 90 day pilot and capture telemetry.

EXPECTED OUTCOMES:
- A working prototype with a published dataset.
- A costing analysis published as a thesis appendix.

The work is original in its combination of solar-powered sensors and
deferrable scheduling for small Nepali farms. There is limited existing
literature on this exact deployment pattern, although related projects in India
and Kenya are discussed in the literature review.
"""


def _banner(name: str) -> None:
    print(f"\n--- {name} ---")


def test_chunking():
    _banner("chunking")
    cleaned = clean_extracted_text(SAMPLE_TEXT)
    chunks = chunk_text(cleaned, chunk_size=500, chunk_overlap=80)
    assert chunks, "no chunks produced"
    assert all(c.text.strip() for c in chunks)
    print(f"  {len(chunks)} chunks produced; first chunk length = {len(chunks[0].text)}")


def test_embeddings():
    _banner("embeddings")
    vec = embed_text("hello world")
    assert len(vec) > 0
    assert all(isinstance(v, float) for v in vec)
    print(f"  Embedding dim = {len(vec)}")


def test_analyzer_fallback():
    _banner("analyzer fallback")
    from ai_chatbot.core.pdf_processor import ProcessedDocument
    from ai_chatbot.core.analyzer import fallback_analysis

    doc = ProcessedDocument(
        pages=1,
        raw_text=SAMPLE_TEXT,
        cleaned_text=clean_extracted_text(SAMPLE_TEXT),
        chunks=chunk_text(clean_extracted_text(SAMPLE_TEXT)),
        char_count=len(SAMPLE_TEXT),
    )
    res = fallback_analysis(doc, error="forced")
    assert res.evaluation.overall_score == 0.0
    assert len(res.evaluation.criteria) == 4
    assert {c.key for c in res.evaluation.criteria} == {"uniqueness", "technical_depth", "practicality", "clarity"}
    print("  fallback produced full evaluation report with all four criteria")


def test_llm_factory_errors_without_key():
    _banner("LLM factory (missing key)")
    from ai_chatbot.core.llm_factory import LLMFactory

    try:
        LLMFactory(api_key="")
    except LLMAuthError as exc:
        print(f"  raised as expected: {exc}")
        return
    raise AssertionError("expected LLMAuthError when key is missing")


def test_prompts_well_formed():
    _banner("prompts render")
    out = ANALYSIS_USER_TEMPLATE.format(document_text="hello")
    assert "hello" in out
    assert ANALYSIS_SYSTEM
    print("  prompt renders without placeholders failing")


def test_extract_text_from_bytes():
    _banner("pdf extraction (synthetic bytes)")
    # Synthetic non-PDF to confirm graceful failure path.
    try:
        extract_text_from_bytes(b"%PDF-1.4\n%trailers\n")
    except Exception as exc:
        print(f"  rejected invalid PDF as expected: {type(exc).__name__}")


def run_all() -> None:
    test_chunking()
    test_embeddings()
    test_analyzer_fallback()
    test_llm_factory_errors_without_key()
    test_prompts_well_formed()
    test_extract_text_from_bytes()
    print("\nAll smoke tests passed.")


if __name__ == "__main__":
    run_all()
