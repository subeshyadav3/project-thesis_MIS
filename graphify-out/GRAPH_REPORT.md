# Graph Report - se  (2026-08-15)

## Corpus Check
- 194 files · ~602,080 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1528 nodes · 3095 edges · 109 communities (94 shown, 15 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4a097bda`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- router.py
- Icon
- App.jsx
- index.js
- test_pipeline.py
- 🎓 Thesis & Project Management System (TPMS)
- ProcessedDocument
- dependencies
- studentGroupController.js
- PageLayout
- resolveCoordinatorScope
- ui.jsx
- LLMFactory
- get_logger
- thesisController.js
- useToast
- pipeline.py
- printController.js
- userController.js
- generate-new-test-data.js
- announcementController.js
- embeddings.py
- generate-samples.js
- groupController.js
- AnalysisStatus
- studentController.js
- ChatAgent
- evaluationController.js
- seed.js
- authController.js
- uploadController.js
- notificationService.js
- middleware/auth.js
- .eslintrc.json
- supervisorController.js
- get_llm
- departmentController.js
- coordinatorScope.js
- chatbotController.js
- emailService.js
- ErrorBoundary
- aiController.js
- ProjectDetail.jsx
- prisma.js
- parseId
- dependencies
- api.jsx
- build_report.py
- AI Chatbot Service — TPMS Thesis Management
- UserManagement.jsx
- auditService.js
- authenticate
- ProposalsSection.jsx
- students.js
- generate_perfect_diagrams.py
- chatbot.js
- supervisors.js
- ai.js
- UI Updates
- Announcements.jsx
- scripts
- errorHandler.js
- routes/auth.js
- groups.js
- theses.js
- users.js
- files-audit.js
- proposalComments.js
- cosine_similarity
- backend/package.json
- devDependencies
- analyzer.py
- express-rate-limit
- Forms.jsx
- forward.js
- print.js
- proposals.js
- studentGroups.js
- examinerAssignments.js
- .prettierrc.json
- fetch_proposal_text
- externalExaminerController.js
- AGENTS.md
- rules/graphify.md
- workflows/graphify.md
- post
- deps.py
- cookie-parser
- express
- analyze
- mammoth
- multer
- nodemailer
- pdfkit
- health
- test-all-flows.js
- evaluations.js
- cors
- PipelineStage
- axios
- resolve_auth_token
- dotenv

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 85 edges
2. `Icon()` - 55 edges
3. `resolveCoordinatorScope()` - 42 edges
4. `api` - 35 edges
5. `LLMFactory` - 26 edges
6. `canManageThesisAsCoordinator()` - 26 edges
7. `authenticate()` - 23 edges
8. `PageLayout()` - 23 edges
9. `canManageGroupAsCoordinator()` - 21 edges
10. `parseId()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `test_llm_factory_errors_without_key()` --uses--> `LLMAuthError`  [INFERRED]
  ai_chatbot/tests/test_pipeline.py → ai_chatbot/core/llm_factory.py
- `DocumentAnalyzer` --uses--> `LLMFactory`  [INFERRED]
  ai_chatbot/core/analyzer.py → ai_chatbot/core/llm_factory.py
- `ChatAgent` --uses--> `LLMFactory`  [INFERRED]
  ai_chatbot/core/chat_agent.py → ai_chatbot/core/llm_factory.py
- `test_llm_factory_errors_without_key()` --uses--> `LLMFactory`  [INFERRED]
  ai_chatbot/tests/test_pipeline.py → ai_chatbot/core/llm_factory.py
- `ChatAgent` --uses--> `LLMUnavailableError`  [INFERRED]
  ai_chatbot/core/chat_agent.py → ai_chatbot/core/llm_factory.py

## Import Cycles
- None detected.

## Communities (109 total, 15 thin omitted)

### Community 0 - "router.py"
Cohesion: 0.19
Nodes (23): _norm(), FastAPI routes for the AI chatbot service., Compute cosine similarity between the source text and each candidate., similarity_endpoint(), AnalyzeAcceptedResponse, AnalyzeRequest, AskResponse, CandidatesResponse (+15 more)

### Community 1 - "Icon"
Cohesion: 0.16
Nodes (22): FileAudit, EvaluationPdfPreview(), ROLE_LABEL, MasterThesisBulkUploadModal(), ROLE_LABEL, SECTION_LABEL, Pagination(), SearchInput() (+14 more)

### Community 2 - "App.jsx"
Cohesion: 0.08
Nodes (23): App(), AuditLog, BachelorProjects, DepartmentManagement, Evaluations, ExaminerList, ExternalEvaluationsList, Login (+15 more)

### Community 3 - "index.js"
Cohesion: 0.05
Nodes (39): aiRoutes, announcementRoutes, app, assignmentRequestRoutes, { authenticate }, authRoutes, chatbotRoutes, cookieParser (+31 more)

### Community 4 - "test_pipeline.py"
Cohesion: 0.10
Nodes (35): _build_synthetic_doc(), Wrap text into the ProcessedDocument shape analyzers expect., _build_url(), chunk_text(), clean_extracted_text(), extract_text_from_bytes(), fetch_document_bytes(), PDFFetchError (+27 more)

### Community 5 - "🎓 Thesis & Project Management System (TPMS)"
Cohesion: 0.05
Nodes (40): 10. Program-Scoped Audit Trail, 11. Email Policy Enforcement, 1. Administration & Program Coordinators, 1. Program Scoping & Degree Isolation, 2. Bachelor Project Lifecycle (`MINOR` / `MAJOR`), 2. Faculty Supervisors & External Examiners, 3. Master Students (M.Sc. Theses & Projects), 3. Master Thesis Lifecycle (+32 more)

### Community 6 - "ProcessedDocument"
Cohesion: 0.22
Nodes (10): notify_backend_status(), Tell the Express backend about the AI status. The backend's…, ProcessedDocument, Result of the full preprocess pipeline., Pipeline, PipelineError, RuntimeError, Execute the full pipeline. (+2 more)

### Community 7 - "dependencies"
Cohesion: 0.06
Nodes (35): @fontsource-variable/dm-sans, @fontsource-variable/inter, dependencies, axios, @fontsource-variable/dm-sans, @fontsource-variable/inter, lucide-react, react (+27 more)

### Community 8 - "studentGroupController.js"
Cohesion: 0.19
Nodes (11): listEligible(), audit, { getDefaultComponents }, GROUP_INCLUDES, {
  listEligibleAnnouncementsForStudent,
  isStudentAlreadyInAGroupAnnouncement,
}, notifSvc, prisma, isStudentAlreadyInAGroupAnnouncement() (+3 more)

### Community 9 - "PageLayout"
Cohesion: 0.16
Nodes (14): StudentProjectDetail, StudentProjects, StudentSubmissions, StudentTheses, buildCrumbs(), PageLayout(), COMMENT_ROLE_COLORS, ROLE_LABEL (+6 more)

### Community 10 - "resolveCoordinatorScope"
Cohesion: 0.11
Nodes (32): test(), completeEvaluation(), assignExaminerToGroup(), assignExaminerToThesis(), audit, emailService, notifSvc, prisma (+24 more)

### Community 11 - "ui.jsx"
Cohesion: 0.06
Nodes (7): AppLayout(), LayoutContext, useLayout(), CommandPalette(), NotificationBell(), Sidebar(), iconMap

### Community 12 - "LLMFactory"
Cohesion: 0.10
Nodes (24): _coerce_json(), _fallback_provider(), get_llm_factory(), LLMAuthError, LLMFactory, LLMOutputError, LLMUnavailableError, Any (+16 more)

### Community 13 - "get_logger"
Cohesion: 0.07
Nodes (39): fetch_analysis(), Any, Persistence layer for AI analysis results. Stores per-proposal AI analyses into…, Create-or-update the analysis row. Returns the row id., safe_json(), upsert_analysis(), get_settings(), Configuration module for the AI chatbot service. Loads environment variables… (+31 more)

### Community 14 - "thesisController.js"
Cohesion: 0.13
Nodes (23): getDefaultComponents(), createGroup(), { assertValidStatusTransition }, audit, bcrypt, { buildThesisWhereForCoordinator, resolveCoordinatorScope, isThesisVisibleToCoordinator, canManageThesisAsCoordinator }, bulkImportConfirm(), bulkImportPreview() (+15 more)

### Community 15 - "useToast"
Cohesion: 0.09
Nodes (25): ExternalDashboard, ExternalEvaluationPage, StudentGroups, ExaminerAssignmentSection(), ExternalExaminerSection(), ProposalsSection(), SupervisorAssignmentSection(), useToast() (+17 more)

### Community 16 - "pipeline.py"
Cohesion: 0.11
Nodes (29): RAG chat agent. Retrieves relevant chunks for the question, builds a context…, embed_text(), Single-text convenience wrapper. Returns a single vector., _average_vector(), has_stored_analysis(), End-to-end pipeline orchestration: fetch → extract → clean → chunk → embed →…, _chromadb_collection(), collection_count() (+21 more)

### Community 17 - "printController.js"
Cohesion: 0.17
Nodes (26): buildBachelorFormat(), buildBlankLines(), buildExternalPage(), buildGroupHtml(), buildMasterFormat(), buildNote(), buildPageHeader(), buildSupervisorPage() (+18 more)

### Community 18 - "userController.js"
Cohesion: 0.11
Nodes (26): audit, bcrypt, bulkCreateUsers(), bulkImportUsersExcel(), { computeCurrentYearSemesterFromBatch }, createUser(), emailService, enrichWithComputedYearSemester() (+18 more)

### Community 19 - "generate-new-test-data.js"
Cohesion: 0.08
Nodes (24): bachelorStudents, bctGroups, bctTitles, emailFor(), externalNames, externals, firstNames, freshName() (+16 more)

### Community 20 - "announcementController.js"
Cohesion: 0.10
Nodes (21): RULES, asCleanAudience(), audit, create(), deactivate(), delete(), deleteFormResponse(), finalizeFormResponse() (+13 more)

### Community 21 - "embeddings.py"
Cohesion: 0.19
Nodes (13): _dev_hash_fallback(), embed_texts(), embedding_dim_for(), force_hash_only(), _load_model(), _model_dim(), Embedding generation backed by sentence-transformers. The model is loaded once…, Return the configured/derived embedding dimensionality. (+5 more)

### Community 22 - "generate-samples.js"
Cohesion: 0.08
Nodes (22): bachelorPrograms, bachelorTemplate, bachelorTestData, externalNames, externalUsersTemplate, firstNames, fs, lastNames (+14 more)

### Community 23 - "groupController.js"
Cohesion: 0.09
Nodes (21): { assertValidStatusTransition }, audit, bcrypt, { buildGroupWhereForCoordinator, resolveCoordinatorScope, isGroupVisibleToCoordinator, canManageGroupAsCoordinator }, bulkImportPreview(), { computeCurrentYearSemesterFromBatch }, emailService, exportGroups() (+13 more)

### Community 24 - "AnalysisStatus"
Cohesion: 0.18
Nodes (10): Inspect where the pipeline currently is for a given proposal., status_endpoint(), _status_or_404(), get_status(), get_tracker(), In-process status tracker for the analyze pipeline. Each proposal has a single-…, Thread-safe-ish in-memory tracker (single-process)." for multi-process…, Return the singleton tracker instance. (+2 more)

### Community 25 - "studentController.js"
Cohesion: 0.10
Nodes (13): audit, fs, { getEngagement }, notifSvc, path, prisma, submitFormResponse(), triggerAIPipeline() (+5 more)

### Community 26 - "ChatAgent"
Cohesion: 0.14
Nodes (16): get_chat_agent(), chat(), chat_stream(), Answer a question grounded in the document's vector store., Stream the answer token-by-token using SSE. Each event is one of: data:…, ChatAgent, _format_context(), _format_history() (+8 more)

### Community 27 - "evaluationController.js"
Cohesion: 0.10
Nodes (25): computeSummary(), getComponentByType(), getScheme(), getTotalMaxMarks(), ROLE_LABEL, SCHEMES, validateMarks(), GROUP_STATUS (+17 more)

### Community 28 - "seed.js"
Cohesion: 0.13
Nodes (19): BACHELOR_PROGRAMS, bachelorRoll(), BATCH_DEFS, bcrypt, firstNames, generateStudentDefs(), { getDefaultComponents }, getProgramFromRoll() (+11 more)

### Community 29 - "authController.js"
Cohesion: 0.13
Nodes (13): audit, bcrypt, { computeCurrentYearSemesterFromBatch }, COOKIE_OPTS, crypto, getMe(), jwt, login() (+5 more)

### Community 30 - "uploadController.js"
Cohesion: 0.13
Nodes (18): ALLOWED_MIME_TYPES, audit, { canAccessProposal, canUploadForItem }, deleteProposal(), detectMimeFromBuffer(), fs, logger, MAGIC_SIGNATURES (+10 more)

### Community 31 - "notificationService.js"
Cohesion: 0.17
Nodes (17): findCoordinatorForItem(), getGroupNotifyIds(), getThesisNotifyIds(), logger, notify(), notifyExaminerAssignment(), notifyMany(), notifyMarksSubmitted() (+9 more)

### Community 32 - "middleware/auth.js"
Cohesion: 0.12
Nodes (15): authorize(), jwt, prisma, { authenticate, authorize }, ctrl, express, router, { authenticate, authorize } (+7 more)

### Community 33 - ".eslintrc.json"
Cohesion: 0.11
Nodes (18): env, browser, es2022, node, extends, ignorePatterns, parserOptions, ecmaVersion (+10 more)

### Community 34 - "supervisorController.js"
Cohesion: 0.15
Nodes (13): acceptAssignment(), acceptGroupSupervision(), acceptThesisSupervision(), audit, findCoordinatorIdsForStudent(), notifSvc, pdfService, prisma (+5 more)

### Community 35 - "get_llm"
Cohesion: 0.23
Nodes (13): build_ask_agent(), LangGraph Q&A agent using Gemini., get_llm(), Return a LangChain-compatible LLM for the configured primary provider. Used by…, build_evaluator(), LangGraph evaluator agent., AskState, EvaluateState (+5 more)

### Community 36 - "departmentController.js"
Cohesion: 0.12
Nodes (3): audit, notifSvc, prisma

### Community 37 - "coordinatorScope.js"
Cohesion: 0.17
Nodes (10): p, { PrismaClient }, { resolveCoordinatorScope, canManageThesisAsCoordinator, isThesisVisibleToCoordinator }, getThesisEvaluations(), isThesisVisibleToCoordinator(), prisma, IMPORTANT: Cross-program is allowed ONLY for MASTER degree-type, p (+2 more)

### Community 38 - "chatbotController.js"
Cohesion: 0.21
Nodes (12): AI_CHATBOT_URL, callChatbot(), chat(), getAnalysis(), getProposalDocumentOr403(), getStatus(), opts_timeout(), prisma (+4 more)

### Community 39 - "emailService.js"
Cohesion: 0.24
Nodes (15): assignSupervisor(), bulkAssignSupervisor(), bulkImportConfirm(), buildUniversityTemplate(), nodemailer, notifyExaminerAssigned(), notifyFeedbackSubmitted(), notifyGroupCreated() (+7 more)

### Community 40 - "ErrorBoundary"
Cohesion: 0.17
Nodes (6): StudentDashboard, SupervisorAssignments, ErrorBoundary, ASSIGN_LABELS, SupervisorAssignments(), StudentDashboard()

### Community 41 - "aiController.js"
Cohesion: 0.26
Nodes (14): ask(), callAI(), callAIStream(), evaluate(), extractText(), fs, getStoragePath(), loadCandidates() (+6 more)

### Community 42 - "ProjectDetail.jsx"
Cohesion: 0.15
Nodes (8): ProjectDetail, BACHELOR_STEPS, MASTER_PROJECT_STEPS, MASTER_STEPS, STEP_REQUIREMENTS, WorkflowStepper(), ProjectDetail(), ROLE_LABEL

### Community 43 - "prisma.js"
Cohesion: 0.12
Nodes (5): prisma, audit, prisma, prisma, { PrismaClient }

### Community 44 - "parseId"
Cohesion: 0.17
Nodes (12): approveLateProposal(), audit, getProposal(), logger, notifSvc, { parseId }, prisma, { PROPOSAL_STATUS } (+4 more)

### Community 45 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcryptjs, jsonwebtoken, pdf-parse, @prisma/client, puppeteer-core, xlsx, bcryptjs (+5 more)

### Community 46 - "api.jsx"
Cohesion: 0.13
Nodes (18): CoordinatorDashboard, SupervisorDashboard, BulkPendingUsersModal(), DESIGNATION_OPTIONS, generateEmail(), normalizeName(), ConfirmDialog(), GroupBulkUploadModal() (+10 more)

### Community 47 - "build_report.py"
Cohesion: 0.24
Nodes (8): add_body_p(), add_fig_image(), add_heading_1(), add_heading_2(), add_heading_3(), add_table_custom(), format_p(), set_cell_bg()

### Community 48 - "AI Chatbot Service — TPMS Thesis Management"
Cohesion: 0.17
Nodes (11): AI Chatbot Service — TPMS Thesis Management, `ai_document_analysis` (created by this service), Capability Surface, `document_embedding` (existing Express-side table), Endpoints, Folder Structure, How the Backend calls this, Persistence layout (+3 more)

### Community 49 - "UserManagement.jsx"
Cohesion: 0.19
Nodes (11): Profile, UserManagement, ROLE_OPTIONS, UsersBulkUploadModal(), COORDINATOR_ALLOWED_ROLES, PAGE_SIZES, UserManagement(), Profile() (+3 more)

### Community 50 - "auditService.js"
Cohesion: 0.13
Nodes (13): audit, notifSvc, prisma, audit, notifSvc, prisma, log(), logger (+5 more)

### Community 51 - "authenticate"
Cohesion: 0.18
Nodes (9): authenticate(), assignmentRequestController, { authenticate, authorize }, express, router, { authenticate }, express, notificationController (+1 more)

### Community 52 - "ProposalsSection.jsx"
Cohesion: 0.16
Nodes (7): AiAssistantModal(), PRESET_CRITERIA, SUGGESTED_QUESTIONS, DocumentViewer(), ROLE_COLORS, STAGE_ICON, STAGE_LABEL

### Community 53 - "students.js"
Cohesion: 0.20
Nodes (9): { authenticate, authorize }, express, fs, multer, path, router, storage, studentController (+1 more)

### Community 54 - "generate_perfect_diagrams.py"
Cohesion: 0.38
Nodes (9): fig1_architecture(), fig2_use_case(), fig3_er(), fig4_sequence_import(), fig5_sequence_supervisor(), fig6_sequence_eval(), fig7_dfd(), fig8_gantt() (+1 more)

### Community 55 - "chatbot.js"
Cohesion: 0.22
Nodes (8): aiController, aiLimiter, { authenticate, authorize }, chatbotController, express, nonStudentOnly, rateLimit, router

### Community 56 - "supervisors.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, express, router, supervisorController

### Community 57 - "ai.js"
Cohesion: 0.25
Nodes (7): aiController, aiLimiter, { authenticate, authorize }, express, nonStudentOnly, rateLimit, router

### Community 58 - "UI Updates"
Cohesion: 0.25
Nodes (7): Color Theme:, Development, Key Components:, New Features:, Responsive Design:, UI Updates, University Thesis Management System - Frontend

### Community 59 - "Announcements.jsx"
Cohesion: 0.22
Nodes (7): CoordinatorAnnouncements, AUDIENCE_LABELS, BACHELOR_DEFAULT_FORM_FIELDS, CoordinatorAnnouncements(), MASTER_PROJECT_FORM_FIELDS, MASTER_THESIS_FORM_FIELDS, TYPE_LABELS

### Community 60 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, dev, prisma:generate, prisma:migrate, prisma:push, prisma:seed, start

### Community 61 - "errorHandler.js"
Cohesion: 0.43
Nodes (5): errorHandler(), { sendError }, sendCreated(), sendError(), sendSuccess()

### Community 62 - "routes/auth.js"
Cohesion: 0.29
Nodes (6): authController, { authenticate }, express, loginLimiter, rateLimit, router

### Community 63 - "groups.js"
Cohesion: 0.29
Nodes (6): { authenticate, authorize }, express, groupController, multer, router, upload

### Community 64 - "theses.js"
Cohesion: 0.29
Nodes (6): { authenticate, authorize }, express, multer, router, thesisController, upload

### Community 65 - "users.js"
Cohesion: 0.29
Nodes (6): { authenticate, authorize }, express, multer, router, upload, userController

### Community 66 - "files-audit.js"
Cohesion: 0.33
Nodes (5): { authenticate, authorize }, express, logger, prisma, router

### Community 67 - "proposalComments.js"
Cohesion: 0.33
Nodes (5): { authenticate, authorize }, commentRole, express, proposalCommentController, router

### Community 68 - "cosine_similarity"
Cohesion: 0.50
Nodes (4): cosine_similarity(), find_similar(), Proposal similarity / soft-plagiarism checker. Given a new proposal's embedded…, Return the top-k candidates ranked by cosine similarity. candidates: list of…

### Community 69 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, version

### Community 70 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, nodemon, prisma, nodemon, prisma

### Community 71 - "analyzer.py"
Cohesion: 0.22
Nodes (15): _band_for(), _coerce_analysis(), fallback_analysis(), _map_criteria(), Any, Document analyzer. Runs the LLM in a single call that returns summary +…, Deterministic placeholder output. Keeps the pipeline alive even if Groq is…, Map raw LLM JSON output into the typed ``DocumentAnalysis`` shape. Resilient:… (+7 more)

### Community 73 - "Forms.jsx"
Cohesion: 0.33
Nodes (4): StudentForms, DEFAULT_STUDENT_FORM_FIELDS, FIELD_TYPES, StudentForms()

### Community 74 - "forward.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, express, forwardController, router

### Community 75 - "print.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, express, printController, router

### Community 76 - "proposals.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, express, proposalController, router

### Community 77 - "studentGroups.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, ctrl, express, router

### Community 78 - "examinerAssignments.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, examinerAssignmentController, express, router

### Community 79 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 82 - "externalExaminerController.js"
Cohesion: 0.20
Nodes (7): audit, { computeSummary }, logger, notifSvc, prisma, make(), ts()

### Community 86 - "post"
Cohesion: 0.13
Nodes (23): ask_endpoint(), ask_stream_endpoint(), _clamp_score(), embed_endpoint(), evaluate_endpoint(), _evaluate_fallback_row(), evaluate_stream_endpoint(), Return an LLM factory for the configured primary provider. Honors the legacy… (+15 more)

### Community 88 - "deps.py"
Cohesion: 0.24
Nodes (7): get_analyzer(), get_pipeline(), Dependency-injection helpers for FastAPI routes., Return a memoized Pipeline., DocumentAnalyzer, Run a single end-to-end analysis pass., Run analysis. Truncates text fed to the model to keep tokens sane.

### Community 91 - "analyze"
Cohesion: 0.22
Nodes (9): analyze(), _fetch_document_type(), _fetch_proposal_url(), Accept an analyze request and run the pipeline in the background. The backend…, Run the pipeline swallowing exceptions (already tracked in status)., Query the Express backend for the Proposal row to find document_url., Return the document type from the Proposal (defaults to PROPOSAL)., _run_pipeline_safe() (+1 more)

### Community 101 - "health"
Cohesion: 0.29
Nodes (7): analysis_endpoint(), candidates_endpoint(), health(), Return the persisted analysis result for a proposal, if any., Return a list of stored proposal vectors used for similarity checks. Scoping…, Lightweight readiness probe used by the orchestrator., get

### Community 102 - "test-all-flows.js"
Cohesion: 0.40
Nodes (5): assert(), axios, bcrypt, prisma, runTests()

### Community 103 - "evaluations.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, evaluationController, express, router

### Community 105 - "PipelineStage"
Cohesion: 0.50
Nodes (4): PipelineStage, Current step the pipeline is executing., Enum, str

## Knowledge Gaps
- **519 isolated node(s):** `Department of Electronics & Computer Engineering (DOECE)`, `Pulchowk Campus — Institute of Engineering, Tribhuvan University`, `📋 Table of Contents`, `📖 Overview`, `🌟 Key Architectural Highlights` (+514 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LLMFactory` connect `LLMFactory` to `router.py`, `test_pipeline.py`, `analyzer.py`, `pipeline.py`, `post`, `deps.py`, `ChatAgent`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `resolveCoordinatorScope()` connect `resolveCoordinatorScope` to `supervisorController.js`, `coordinatorScope.js`, `emailService.js`, `thesisController.js`, `userController.js`, `groupController.js`, `evaluationController.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `Icon`, `App.jsx`, `ErrorBoundary`, `PageLayout`, `Forms.jsx`, `ProjectDetail.jsx`, `api.jsx`, `UserManagement.jsx`, `ProposalsSection.jsx`, `Announcements.jsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `Department of Electronics & Computer Engineering (DOECE)`, `Pulchowk Campus — Institute of Engineering, Tribhuvan University`, `📋 Table of Contents` to the rest of the system?**
  _519 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08266129032258064 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `test_pipeline.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1021021021021021 - nodes in this community are weakly interconnected._