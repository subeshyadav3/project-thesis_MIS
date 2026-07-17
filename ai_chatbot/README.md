# AI Chatbot Service — TPMS Thesis Management

FastAPI microservice that backs the AI Assistant surface in the project/thesis
management system. It is **completely separate** from the Express backend and
communicates over REST. The Express backend forwards student-uploaded documents
to this service.

## Capability Surface

| Concern | Implementation |
|---|---|
| PDF parsing | PyMuPDF (fitz) |
| Text cleaning | bespoke normalizer (whitespace, headers, pagination) |
| Chunking | sliding-window paragraph chunker (configurable size + overlap) |
| Embeddings | sentence-transformers `BAAI/bge-small-en-v1.5` (deterministic hash fallback for CI) |
| Vector store | ChromaDB (per-doc collection) |
| LLM | Groq `llama-3.1-70b-versatile` via official SDK |
| Storage | PostgreSQL via SQLAlchemy async + aiogram-style table `ai_document_analysis` |
| Persistence | both PG (analysis result) and the existing Express-side `document_embedding` row |
| Streaming | Server-Sent Events (text/event-stream) |

## Folder Structure

```
ai_chatbot/
├── main.py                       # FastAPI entry point (uvicorn target)
├── requirements.txt
├── .env.example
├── app/                          # Application layer (HTTP wiring)
│   ├── deps.py                   # dependency-injection helpers
│   └── router.py                 # REST routes
├── core/                         # Domain layer
│   ├── config.py                 # typed Settings
│   ├── logger.py                 # structured logging
│   ├── pdf_processor.py          # fetch + extract + clean + chunk
│   ├── embeddings.py             # sentence-transformers wrapper
│   ├── vector_store.py           # ChromaDB wrapper
│   ├── prompts.py                # analysis + answer prompts
│   ├── analyzer.py               # LLM analysis (summary + keywords + evaluation)
│   ├── chat_agent.py             # RAG-style Q&A (sync + streaming)
│   ├── analysis_repository.py    # PG persistence + backend notify
│   ├── pipeline.py               # orchestrator: fetch → process → embed → analyze → persist
│   └── status_tracker.py         # in-memory per-proposal status
├── models/                       # Data layer
│   ├── schemas.py                # pydantic request/response DTOs
│   ├── database.py               # SQLAlchemy ORM tables
│   └── db.py                     # async engine + session_scope()
└── tests/
    └── test_pipeline.py          # smoke tests
```

## Running locally

```bash
# 1. Create venv (one-time)
python -m venv ai_chatbot\.venv
.\ai_chatbot\.venv\Scripts\python.exe -m pip install -r ai_chatbot\requirements.txt

# 2. Set environment values
copy ai_chatbot\.env.example ai_chatbot\.env
# Edit: GROQ_API_KEY, DATABASE_URL, AI_CHATBOT_URL

# 3. Run
.\ai_chatbot\.venv\Scripts\python.exe -m uvicorn ai_chatbot.main:app --host 0.0.0.0 --port 8001 --reload
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/ai/health` | connectivity probe |
| POST | `/api/ai/analyze` | trigger full pipeline (fetch → extract → chunk → embed → analyze → persist) |
| GET  | `/api/ai/status/{proposal_id}` | live pipeline status for one document |
| GET  | `/api/ai/analysis/{proposal_id}` | persisted result (summary, scores, keywords) |
| POST | `/api/ai/chat` | RAG Q&A — non-streaming |
| POST | `/api/ai/chat/stream` | RAG Q&A — SSE streaming |

### Request shapes

`POST /api/ai/analyze`
```json
{ "proposal_id": 12, "document_url": "/api/files/groups/foo.pdf", "force_recompute": false }
```

`POST /api/ai/chat`
```json
{ "proposal_id": 12, "question": "What is the proposed methodology?", "top_k": 4, "history": [] }
```

## How the Backend calls this

The Express backend fires `POST {AI_CHATBOT_URL}/api/ai/analyze` from inside
`backend/src/controllers/uploadController.js` and `studentController.js`
immediately after a proposal is uploaded. The call is fire-and-forget (`setImmediate`);
the upload response is sent to the student without waiting.

Errors logged on the backend are non-fatal — if the AI service is down, the
document is still viewable, only the AI-augmented summaries disappear.

## Persistence layout

### `ai_document_analysis` (created by this service)

| column | type | notes |
|---|---|---|
| id | serial PK | |
| proposal_id | int, unique, FK→proposal | one row per document |
| summary | text | executive summary |
| keywords | jsonb | up to 12 keywords |
| overall_score | float | rounded /10 |
| overall_band | text | excellent/strong/adequate/weak/poor |
| evaluation | jsonb | full scores per criterion, with reason + evidence |
| char_count | int | document char count |
| chunk_count | int | chunk count |
| model | text | which LLM was used |
| created_at / updated_at | timestamptz | |

### `document_embedding` (existing Express-side table)

Now also stores `summary_text` and `evaluation` (jsonb). This lets the
existing AiAssistantModal surface research-paper-style summaries without
making a second service call.

## Tests

```
.\ai_chatbot\.venv\Scripts\python.exe ai_chatbot\tests\test_pipeline.py
```

Six smoke tests exercise:
- chunking correctness
- embedding fallback path
- analyzer fallback structure (all four criteria present)
- LLM factory refuses to construct without an API key
- prompts render without `KeyError`s
- PDF extraction rejects malformed input
