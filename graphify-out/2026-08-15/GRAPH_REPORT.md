# Graph Report - se  (2026-08-15)

## Corpus Check
- 192 files · ~355,636 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1515 nodes · 3160 edges · 106 communities (89 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2c12357`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- router.py
- PageLayout
- App.jsx
- index.js
- test_pipeline.py
- 🎓 Thesis & Project Management System (TPMS)
- analyzer.py
- dependencies
- ToastContext.jsx
- Assignment.jsx
- resolveCoordinatorScope
- ui.jsx
- LLMFactory
- analysis_repository.py
- thesisController.js
- useToast
- vector_store.py
- printController.js
- userController.js
- generate-new-test-data.js
- announcementController.js
- llm_factory.py
- generate-samples.js
- groupController.js
- AnalysisStatus
- studentController.js
- pipeline.py
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
- notificationController.js
- chatbotController.js
- emailService.js
- Icon
- aiController.js
- embeddings.py
- post
- parseId
- dependencies
- api.jsx
- build_report.py
- AI Chatbot Service — TPMS Thesis Management
- UserManagement.jsx
- externalExaminerController.js
- authenticate
- coordinatorScope.js
- students.js
- generate_perfect_diagrams.py
- chatbot.js
- axios
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
- prisma.js
- announcements.js
- examinerAssignments.js
- forward.js
- print.js
- proposals.js
- studentGroups.js
- Pipeline
- .prettierrc.json
- fetch_proposal_text
- studentGroupController.js
- AGENTS.md
- rules/graphify.md
- workflows/graphify.md
- .ask
- analyze
- cookie-parser
- dotenv
- express
- checkOverdue.js
- mammoth
- multer
- nodemailer
- pdfkit
- health
- evaluations.js
- resolve_auth_token
- cors
- bcryptjs

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 85 edges
2. `Icon()` - 55 edges
3. `api` - 47 edges
4. `resolveCoordinatorScope()` - 44 edges
5. `PageLayout()` - 32 edges
6. `ErrorBoundary` - 29 edges
7. `canManageThesisAsCoordinator()` - 28 edges
8. `LLMFactory` - 26 edges
9. `authenticate()` - 23 edges
10. `canManageGroupAsCoordinator()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `_coerce_analysis()` --uses--> `ProcessedDocument`  [INFERRED]
  ai_chatbot/core/analyzer.py → ai_chatbot/core/pdf_processor.py
- `DocumentAnalyzer` --uses--> `LLMFactory`  [INFERRED]
  ai_chatbot/core/analyzer.py → ai_chatbot/core/llm_factory.py
- `DocumentAnalyzer` --uses--> `ProcessedDocument`  [INFERRED]
  ai_chatbot/core/analyzer.py → ai_chatbot/core/pdf_processor.py
- `Pipeline` --uses--> `DocumentAnalyzer`  [INFERRED]
  ai_chatbot/core/pipeline.py → ai_chatbot/core/analyzer.py
- `fallback_analysis()` --uses--> `ProcessedDocument`  [INFERRED]
  ai_chatbot/core/analyzer.py → ai_chatbot/core/pdf_processor.py

## Import Cycles
- None detected.

## Communities (106 total, 17 thin omitted)

### Community 0 - "router.py"
Cohesion: 0.15
Nodes (31): embed_endpoint(), _norm(), FastAPI routes for the AI chatbot service., Return a single dense embedding vector for the supplied text. The Node backend…, Compute cosine similarity between the source text and each candidate., similarity_endpoint(), embed_text(), Single-text convenience wrapper. Returns a single vector. (+23 more)

### Community 1 - "PageLayout"
Cohesion: 0.14
Nodes (21): Evaluations, SupervisorAssignments, ErrorBoundary, EvaluationPdfPreview(), PageLayout(), Pagination(), SearchInput(), TableSkeleton() (+13 more)

### Community 2 - "App.jsx"
Cohesion: 0.07
Nodes (26): App(), AuditLog, BachelorProjects, DepartmentManagement, ExaminerList, ExternalEvaluationsList, FileAudit, Login (+18 more)

### Community 3 - "index.js"
Cohesion: 0.05
Nodes (39): aiRoutes, announcementRoutes, app, assignmentRequestRoutes, { authenticate }, authRoutes, chatbotRoutes, cookieParser (+31 more)

### Community 4 - "test_pipeline.py"
Cohesion: 0.13
Nodes (29): _build_synthetic_doc(), Wrap text into the ProcessedDocument shape analyzers expect., chunk_text(), clean_extracted_text(), extract_text_from_bytes(), process_pdf_async(), process_pdf_sync(), ProcessedDocument (+21 more)

### Community 5 - "🎓 Thesis & Project Management System (TPMS)"
Cohesion: 0.05
Nodes (36): 10. Program-Scoped Audit Trail, 11. Email Policy Enforcement, 1. Program Scoping & Degree Isolation, 2. Bachelor Project Lifecycle (`MINOR` / `MAJOR`), 3. Master Thesis Lifecycle, 4. Form Responses Matrix & Inline Finalization, 5. Cross-Role Faculty Utilization & Conflict-of-Interest Guard, 6. Multi-Project Engagement Prevention (+28 more)

### Community 6 - "analyzer.py"
Cohesion: 0.22
Nodes (15): _band_for(), _coerce_analysis(), fallback_analysis(), _map_criteria(), Any, Document analyzer. Runs the LLM in a single call that returns summary +…, Deterministic placeholder output. Keeps the pipeline alive even if Groq is…, Map raw LLM JSON output into the typed ``DocumentAnalysis`` shape. Resilient:… (+7 more)

### Community 7 - "dependencies"
Cohesion: 0.06
Nodes (35): @fontsource-variable/dm-sans, @fontsource-variable/inter, dependencies, axios, @fontsource-variable/dm-sans, @fontsource-variable/inter, lucide-react, react (+27 more)

### Community 8 - "ToastContext.jsx"
Cohesion: 0.13
Nodes (13): ProjectDetail, ConfirmDialog(), ExaminerAssignmentSection(), ExternalExaminerSection(), SupervisorAssignmentSection(), BACHELOR_STEPS, MASTER_STEPS, STEP_REQUIREMENTS (+5 more)

### Community 9 - "Assignment.jsx"
Cohesion: 0.10
Nodes (20): StudentProjectDetail, StudentProjects, StudentSubmissions, StudentTheses, AiAssistantModal(), PRESET_CRITERIA, SUGGESTED_QUESTIONS, DocumentViewer() (+12 more)

### Community 10 - "resolveCoordinatorScope"
Cohesion: 0.11
Nodes (30): completeEvaluation(), assignExaminerToGroup(), assignExaminerToThesis(), audit, emailService, notifSvc, prisma, removeAssignment() (+22 more)

### Community 12 - "LLMFactory"
Cohesion: 0.09
Nodes (21): _coerce_json(), _fallback_provider(), LLMAuthError, LLMFactory, LLMOutputError, LLMUnavailableError, Any, RuntimeError (+13 more)

### Community 13 - "analysis_repository.py"
Cohesion: 0.10
Nodes (26): fetch_analysis(), notify_backend_status(), Any, Persistence layer for AI analysis results. Stores per-proposal AI analyses into…, Tell the Express backend about the AI status. The backend's…, Create-or-update the analysis row. Returns the row id., safe_json(), upsert_analysis() (+18 more)

### Community 14 - "thesisController.js"
Cohesion: 0.10
Nodes (28): getDefaultComponents(), createGroup(), { assertValidStatusTransition }, audit, bcrypt, { buildThesisWhereForCoordinator, resolveCoordinatorScope, isThesisVisibleToCoordinator, canManageThesisAsCoordinator }, bulkImportPreview(), createThesis() (+20 more)

### Community 15 - "useToast"
Cohesion: 0.11
Nodes (22): ExternalEvaluationPage, SupervisorDashboard, ProposalsSection(), SupervisionActions(), useToast(), AuditLog(), BachelorProjects(), ExaminerList() (+14 more)

### Community 16 - "vector_store.py"
Cohesion: 0.14
Nodes (23): has_stored_analysis(), _chromadb_collection(), collection_count(), _collection_name(), delete_proposal_chunks(), _empty(), _ensure_dir(), _flatten_query_result() (+15 more)

### Community 17 - "printController.js"
Cohesion: 0.17
Nodes (27): buildBachelorFormat(), buildBlankLines(), buildExternalPage(), buildGroupHtml(), buildMasterFormat(), buildNote(), buildPageHeader(), buildSupervisorPage() (+19 more)

### Community 18 - "userController.js"
Cohesion: 0.11
Nodes (26): audit, bcrypt, bulkCreateUsers(), bulkImportUsersExcel(), { computeCurrentYearSemesterFromBatch }, createUser(), emailService, enrichWithComputedYearSemester() (+18 more)

### Community 19 - "generate-new-test-data.js"
Cohesion: 0.08
Nodes (24): bachelorStudents, bctGroups, bctTitles, emailFor(), externalNames, externals, firstNames, freshName() (+16 more)

### Community 20 - "announcementController.js"
Cohesion: 0.11
Nodes (21): RULES, asCleanAudience(), audit, create(), deactivate(), delete(), deleteFormResponse(), finalizeFormResponse() (+13 more)

### Community 21 - "llm_factory.py"
Cohesion: 0.15
Nodes (17): get_settings(), Configuration module for the AI chatbot service. Loads environment variables…, Factory cached by lru_cache in deps.py. Kept as a small wrapper for DI., Application settings loaded from environment variables. Environment variables…, Settings, LLM factory — Groq primary, NVIDIA build API fallback. Both providers are…, configure_logging(), get_logger() (+9 more)

### Community 22 - "generate-samples.js"
Cohesion: 0.08
Nodes (22): bachelorPrograms, bachelorTemplate, bachelorTestData, externalNames, externalUsersTemplate, firstNames, fs, lastNames (+14 more)

### Community 23 - "groupController.js"
Cohesion: 0.10
Nodes (19): { assertValidStatusTransition }, audit, bcrypt, { buildGroupWhereForCoordinator, resolveCoordinatorScope, isGroupVisibleToCoordinator, canManageGroupAsCoordinator }, bulkImportPreview(), { computeCurrentYearSemesterFromBatch }, emailService, exportGroups() (+11 more)

### Community 24 - "AnalysisStatus"
Cohesion: 0.14
Nodes (14): Inspect where the pipeline currently is for a given proposal., status_endpoint(), _status_or_404(), get_status(), get_tracker(), In-process status tracker for the analyze pipeline. Each proposal has a single-…, Thread-safe-ish in-memory tracker (single-process)." for multi-process…, Return the singleton tracker instance. (+6 more)

### Community 25 - "studentController.js"
Cohesion: 0.10
Nodes (13): audit, fs, { getEngagement }, notifSvc, path, prisma, submitFormResponse(), triggerAIPipeline() (+5 more)

### Community 26 - "pipeline.py"
Cohesion: 0.13
Nodes (16): get_analyzer(), get_chat_agent(), get_pipeline(), Dependency-injection helpers for FastAPI routes., Return a memoized Pipeline., DocumentAnalyzer, Run a single end-to-end analysis pass., Run analysis. Truncates text fed to the model to keep tokens sane. (+8 more)

### Community 27 - "evaluationController.js"
Cohesion: 0.14
Nodes (18): computeSummary(), getComponentByType(), getScheme(), getTotalMaxMarks(), ROLE_LABEL, SCHEMES, validateMarks(), audit (+10 more)

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
Nodes (15): authorize(), jwt, prisma, assignmentRequestController, { authenticate, authorize }, express, router, { authenticate, authorize } (+7 more)

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

### Community 38 - "chatbotController.js"
Cohesion: 0.20
Nodes (12): AI_CHATBOT_URL, callChatbot(), chat(), getAnalysis(), getProposalDocumentOr403(), getStatus(), opts_timeout(), prisma (+4 more)

### Community 39 - "emailService.js"
Cohesion: 0.24
Nodes (16): assignSupervisor(), bulkAssignSupervisor(), bulkImportConfirm(), bulkImportConfirm(), buildUniversityTemplate(), nodemailer, notifyExaminerAssigned(), notifyFeedbackSubmitted() (+8 more)

### Community 40 - "Icon"
Cohesion: 0.10
Nodes (18): CoordinatorDashboard, ExternalDashboard, MaintainerDashboard, StudentNotifications, LayoutContext, useLayout(), CommandPalette(), NotificationBell() (+10 more)

### Community 41 - "aiController.js"
Cohesion: 0.26
Nodes (14): ask(), callAI(), callAIStream(), evaluate(), extractText(), fs, getStoragePath(), loadCandidates() (+6 more)

### Community 42 - "embeddings.py"
Cohesion: 0.19
Nodes (13): _dev_hash_fallback(), embed_texts(), embedding_dim_for(), force_hash_only(), _load_model(), _model_dim(), Embedding generation backed by sentence-transformers. The model is loaded once…, Return the configured/derived embedding dimensionality. (+5 more)

### Community 43 - "post"
Cohesion: 0.12
Nodes (23): ask_endpoint(), ask_stream_endpoint(), chat(), chat_stream(), _clamp_score(), evaluate_endpoint(), _evaluate_fallback_row(), evaluate_stream_endpoint() (+15 more)

### Community 44 - "parseId"
Cohesion: 0.15
Nodes (14): approveLateProposal(), audit, getProposal(), logger, notifSvc, { parseId }, prisma, { PROPOSAL_STATUS } (+6 more)

### Community 45 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, express-rate-limit, jsonwebtoken, pdf-parse, @prisma/client, puppeteer-core, xlsx, express-rate-limit (+5 more)

### Community 46 - "api.jsx"
Cohesion: 0.15
Nodes (15): MasterThesis, BulkPendingUsersModal(), DESIGNATION_OPTIONS, generateEmail(), normalizeName(), ROLE_LABEL, GroupBulkUploadModal(), MasterThesisBulkUploadModal() (+7 more)

### Community 47 - "build_report.py"
Cohesion: 0.24
Nodes (8): add_body_p(), add_fig_image(), add_heading_1(), add_heading_2(), add_heading_3(), add_table_custom(), format_p(), set_cell_bg()

### Community 48 - "AI Chatbot Service — TPMS Thesis Management"
Cohesion: 0.17
Nodes (11): AI Chatbot Service — TPMS Thesis Management, `ai_document_analysis` (created by this service), Capability Surface, `document_embedding` (existing Express-side table), Endpoints, Folder Structure, How the Backend calls this, Persistence layout (+3 more)

### Community 49 - "UserManagement.jsx"
Cohesion: 0.24
Nodes (9): Profile, UserManagement, COORDINATOR_ALLOWED_ROLES, PAGE_SIZES, UserManagement(), Profile(), formatYearSemester(), ROMAN (+1 more)

### Community 50 - "externalExaminerController.js"
Cohesion: 0.25
Nodes (5): audit, { computeSummary }, logger, notifSvc, prisma

### Community 51 - "authenticate"
Cohesion: 0.18
Nodes (9): authenticate(), { authenticate }, express, notificationController, router, { authenticate, authorize }, express, router (+1 more)

### Community 52 - "coordinatorScope.js"
Cohesion: 0.24
Nodes (8): p, { PrismaClient }, { resolveCoordinatorScope, canManageThesisAsCoordinator, isThesisVisibleToCoordinator }, test(), getThesisEvaluations(), isThesisVisibleToCoordinator(), prisma, IMPORTANT: Cross-program is allowed ONLY for MASTER degree-type

### Community 53 - "students.js"
Cohesion: 0.20
Nodes (9): { authenticate, authorize }, express, fs, multer, path, router, storage, studentController (+1 more)

### Community 54 - "generate_perfect_diagrams.py"
Cohesion: 0.38
Nodes (9): fig1_architecture(), fig2_use_case(), fig3_er(), fig4_sequence_import(), fig5_sequence_supervisor(), fig6_sequence_eval(), fig7_dfd(), fig8_gantt() (+1 more)

### Community 55 - "chatbot.js"
Cohesion: 0.22
Nodes (8): aiController, aiLimiter, { authenticate, authorize }, chatbotController, express, nonStudentOnly, rateLimit, router

### Community 57 - "ai.js"
Cohesion: 0.25
Nodes (7): aiController, aiLimiter, { authenticate, authorize }, express, nonStudentOnly, rateLimit, router

### Community 58 - "UI Updates"
Cohesion: 0.25
Nodes (7): Color Theme:, Development, Key Components:, New Features:, Responsive Design:, UI Updates, University Thesis Management System - Frontend

### Community 59 - "Announcements.jsx"
Cohesion: 0.25
Nodes (6): CoordinatorAnnouncements, AUDIENCE_LABELS, BACHELOR_DEFAULT_FORM_FIELDS, CoordinatorAnnouncements(), DEFAULT_FORM_FIELDS, TYPE_LABELS

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

### Community 71 - "prisma.js"
Cohesion: 0.09
Nodes (17): audit, notifSvc, prisma, audit, notifSvc, prisma, audit, prisma (+9 more)

### Community 72 - "announcements.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, ctrl, express, router

### Community 73 - "examinerAssignments.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, examinerAssignmentController, express, router

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

### Community 78 - "Pipeline"
Cohesion: 0.18
Nodes (13): _build_url(), fetch_document_bytes(), PDFFetchError, RuntimeError, File could not be obtained from the backend., Resolve a stored ``/api/files/…``-style path into a fully-qualified URL., Download the PDF from the backend. Accepts either a fully-qualified URL or the…, Pipeline (+5 more)

### Community 79 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 82 - "studentGroupController.js"
Cohesion: 0.19
Nodes (11): listEligible(), audit, { getDefaultComponents }, GROUP_INCLUDES, {
  listEligibleAnnouncementsForStudent,
  isStudentAlreadyInAGroupAnnouncement,
}, notifSvc, prisma, isStudentAlreadyInAGroupAnnouncement() (+3 more)

### Community 86 - ".ask"
Cohesion: 0.27
Nodes (7): _format_context(), _format_history(), Non-streaming answer., Async generator yielding (delta, None) chunks and a final (None, result) at end., Compact conversation history format. Limit to last 6 turns., Build the numbered context block the prompt expects. Returns the formatted…, ChatFinalResponse

### Community 87 - "analyze"
Cohesion: 0.22
Nodes (9): analyze(), _fetch_document_type(), _fetch_proposal_url(), Accept an analyze request and run the pipeline in the background. The backend…, Run the pipeline swallowing exceptions (already tracked in status)., Query the Express backend for the Proposal row to find document_url., Return the document type from the Proposal (defaults to PROPOSAL)., _run_pipeline_safe() (+1 more)

### Community 91 - "checkOverdue.js"
Cohesion: 0.32
Nodes (6): GROUP_STATUS, PROPOSAL_STATUS, SUPERVISOR_ASSIGNMENT_STATUS, THESIS_STATUS, { GROUP_STATUS, THESIS_STATUS }, prisma

### Community 101 - "health"
Cohesion: 0.29
Nodes (7): analysis_endpoint(), candidates_endpoint(), health(), Return the persisted analysis result for a proposal, if any., Return a list of stored proposal vectors used for similarity checks. Scoping…, Lightweight readiness probe used by the orchestrator., get

### Community 102 - "evaluations.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, evaluationController, express, router

## Knowledge Gaps
- **510 isolated node(s):** `root`, `dist`, `node_modules`, `ecmaVersion`, `sourceType` (+505 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDefaultComponents()` connect `thesisController.js` to `emailService.js`, `studentGroupController.js`, `groupController.js`, `evaluationController.js`, `seed.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `resolveCoordinatorScope()` connect `resolveCoordinatorScope` to `supervisorController.js`, `emailService.js`, `thesisController.js`, `printController.js`, `userController.js`, `coordinatorScope.js`, `groupController.js`, `evaluationController.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `PageLayout`, `App.jsx`, `ToastContext.jsx`, `Assignment.jsx`, `Icon`, `api.jsx`, `UserManagement.jsx`, `Announcements.jsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `root`, `dist`, `node_modules` to the rest of the system?**
  _510 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `router.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14583333333333334 - nodes in this community are weakly interconnected._
- **Should `PageLayout` be split into smaller, more focused modules?**
  _Cohesion score 0.14268292682926828 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._