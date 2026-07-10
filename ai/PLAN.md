# AI Microservice – LangChain / LangGraph Integration Plan
#
# PROBLEM
#   - Non-students (coordinator, supervisor, external examiner) want to
#     quickly understand or evaluate proposal documents without reading
#     the full PDF.
#   - Manual marking of proposals is subjective and time-consuming.
#
# SOLUTION
#   A Python FastAPI sidecar that exposes two autonomous LangGraph agents:
#
#   Agent 1 – SUMMARIZER  ("read-proposal")
#     - Accepts: proposalId or PDF url
#     - Workflow:
#       1. Fetch document from the Node backend (/api/files/...)
#       2. Chunk & embed using LangChain text splitters
#       3. Generate a structured summary (executive summary, objectives,
#          methodology, timeline, strengths, weaknesses)
#       4. Return JSON + optionally store to DB
#     - Trigger: POST /api/ai/summarize/:proposalId
#     - Auth: only COORDINATOR, SUPERVISOR, EXTERNAL_EXAMINER
#
#   Agent 2 – MARKER  ("evaluate-proposal")
#     - Accepts: proposalId + optional criteria overrides
#     - Workflow:
#       1. Fetch document
#       2. Load evaluation criteria from the backend (EvaluationComponent rows)
#       3. For each criterion, use LLM to score (0-maxMarks) with reasoning
#       4. Compute total + percentage
#       5. Return structured marking result
#     - Trigger: POST /api/ai/evaluate/:proposalId
#     - Auth: same as above
#
# ARCHITECTURE
#   ai/
#     requirements.txt
#     main.py                  # FastAPI entry, mounts routers
#     .env.example
#     core/
#       __init__.py
#       config.py              # env / settings loader
#       state.py               # LangGraph state schema
#       summarizer.py          # Summarizer agent graph + nodes
#       marker.py              # Marker agent graph + nodes
#       pdf_loader.py          # LangChain document loader wrapper
#       llm_factory.py         # LLM instantiation (OpenAI / Anthropic / Ollama)
#     api/
#       __init__.py
#       router.py              # /api/ai/* endpoints
#       deps.py                # auth + deps (verify JWT, call backend)
#     tests/
#       __init__.py
#       test_summarizer.py
#       test_marker.py
#
# LANGGRAPH FLOW (summarizer example):
#
#   class SummarizeState(TypedDict):
#       proposal_id: int
#       document_url: str
#       raw_text: str
#       chunks: list[str]
#       summary: dict
#       error: str | None
#
#   def fetch_document(state) -> dict: ...
#   def chunk_text(state) -> dict: ...
#   def summarize(state) -> dict: ...
#
#   builder = StateGraph(SummarizeState)
#   builder.add_node("fetch", fetch_document)
#   builder.add_node("chunk", chunk_text)
#   builder.add_node("summarize", summarize)
#   builder.set_entry_point("fetch")
#   builder.add_edge("fetch", "chunk")
#   builder.add_edge("chunk", "summarize")
#   builder.add_conditional_edges("summarize", ...)
#
# NODE.JS INTEGRATION
#   - New route: POST /api/ai/summarize/:proposalId
#     (in backend/src/routes/ai.js)
#   - Proxies to Python service via HTTP (configurable AI_SERVICE_URL).
#   - Error handling: if Python service is down, falls through gracefully.
#
# NEXT STEPS
#   1. Decide LLM provider (Anthropic Claude / OpenAI GPT / local Ollama)
#   2. Set AI_SERVICE_URL + API keys in .env
#   3. `cd ai && pip install -r requirements.txt`
#   4. Implement each node in core/*
#   5. Wire into Node backend index.js + route + controller
#   6. Add frontend button "AI Summarize" / "AI Evaluate" on proposal view
