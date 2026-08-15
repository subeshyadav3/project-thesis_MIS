# Graph Report - se  (2026-08-15)

## Corpus Check
- 191 files · ~354,303 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1514 nodes · 3159 edges · 99 communities (83 shown, 16 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d13eb25`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- router.py
- PageLayout.jsx
- App.jsx
- index.js
- test_pipeline.py
- 🎓 Thesis & Project Management System (TPMS)
- analyzer.py
- dependencies
- api.jsx
- Assignment.jsx
- resolveCoordinatorScope
- ui.jsx
- LLMFactory
- pipeline.py
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
- chat_agent.py
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
- proposalCommentController.js
- parseId
- dependencies
- auditService.js
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
- supervisors.js
- .prettierrc.json
- fetch_proposal_text
- AGENTS.md
- rules/graphify.md
- workflows/graphify.md
- cookie-parser
- dotenv
- express
- express-rate-limit
- mammoth
- multer
- nodemailer
- pdfkit
- cors

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
- `embed_endpoint()` --indirect_call--> `embed_text()`  [INFERRED]
  ai_chatbot/app/router.py → ai_chatbot/core/embeddings.py
- `similarity_endpoint()` --indirect_call--> `embed_text()`  [INFERRED]
  ai_chatbot/app/router.py → ai_chatbot/core/embeddings.py
- `DocumentAnalyzer` --uses--> `LLMFactory`  [INFERRED]
  ai_chatbot/core/analyzer.py → ai_chatbot/core/llm_factory.py
- `ChatAgent` --uses--> `LLMFactory`  [INFERRED]
  ai_chatbot/core/chat_agent.py → ai_chatbot/core/llm_factory.py
- `ChatAgent` --uses--> `LLMUnavailableError`  [INFERRED]
  ai_chatbot/core/chat_agent.py → ai_chatbot/core/llm_factory.py

## Import Cycles
- None detected.

## Communities (99 total, 16 thin omitted)

### Community 0 - "router.py"
Cohesion: 0.07
Nodes (62): analyze(), ask_endpoint(), ask_stream_endpoint(), candidates_endpoint(), chat(), chat_stream(), _clamp_score(), embed_endpoint() (+54 more)

### Community 1 - "PageLayout.jsx"
Cohesion: 0.14
Nodes (23): BachelorProjects, SupervisorAssignments, useLayout(), ErrorBoundary, EvaluationPdfPreview(), buildCrumbs(), PageLayout(), ROLE_LABEL (+15 more)

### Community 2 - "App.jsx"
Cohesion: 0.07
Nodes (31): App(), AuditLog, CoordinatorDashboard, DepartmentManagement, ExaminerList, ExternalDashboard, ExternalEvaluationsList, FileAudit (+23 more)

### Community 3 - "index.js"
Cohesion: 0.05
Nodes (39): aiRoutes, announcementRoutes, app, assignmentRequestRoutes, { authenticate }, authRoutes, chatbotRoutes, cookieParser (+31 more)

### Community 4 - "test_pipeline.py"
Cohesion: 0.10
Nodes (36): _build_synthetic_doc(), Wrap text into the ProcessedDocument shape analyzers expect., embed_text(), Single-text convenience wrapper. Returns a single vector., _build_url(), chunk_text(), clean_extracted_text(), extract_text_from_bytes() (+28 more)

### Community 5 - "🎓 Thesis & Project Management System (TPMS)"
Cohesion: 0.05
Nodes (36): 10. Program-Scoped Audit Trail, 11. Email Policy Enforcement, 1. Program Scoping & Degree Isolation, 2. Bachelor Project Lifecycle (`MINOR` / `MAJOR`), 3. Master Thesis Lifecycle, 4. Form Responses Matrix & Inline Finalization, 5. Cross-Role Faculty Utilization & Conflict-of-Interest Guard, 6. Multi-Project Engagement Prevention (+28 more)

### Community 6 - "analyzer.py"
Cohesion: 0.12
Nodes (25): _band_for(), _coerce_analysis(), DocumentAnalyzer, fallback_analysis(), _map_criteria(), Any, Document analyzer. Runs the LLM in a single call that returns summary +…, Run a single end-to-end analysis pass. (+17 more)

### Community 7 - "dependencies"
Cohesion: 0.06
Nodes (35): @fontsource-variable/dm-sans, @fontsource-variable/inter, dependencies, axios, @fontsource-variable/dm-sans, @fontsource-variable/inter, lucide-react, react (+27 more)

### Community 8 - "api.jsx"
Cohesion: 0.11
Nodes (21): Evaluations, ProjectDetail, StudentGroups, ConfirmDialog(), ROLE_LABEL, ExaminerAssignmentSection(), ExternalExaminerSection(), TYPE_ICON (+13 more)

### Community 9 - "Assignment.jsx"
Cohesion: 0.10
Nodes (21): StudentProjectDetail, StudentProjects, StudentSubmissions, StudentTheses, AiAssistantModal(), PRESET_CRITERIA, SUGGESTED_QUESTIONS, DocumentViewer() (+13 more)

### Community 10 - "resolveCoordinatorScope"
Cohesion: 0.11
Nodes (30): completeEvaluation(), submitComponentMarks(), assignExaminerToGroup(), assignExaminerToThesis(), audit, emailService, notifSvc, prisma (+22 more)

### Community 11 - "ui.jsx"
Cohesion: 0.06
Nodes (5): iconMap, BACHELOR_STEPS, MASTER_STEPS, STEP_REQUIREMENTS, WorkflowStepper()

### Community 12 - "LLMFactory"
Cohesion: 0.10
Nodes (21): _coerce_json(), _fallback_provider(), LLMAuthError, LLMFactory, LLMOutputError, LLMUnavailableError, Any, RuntimeError (+13 more)

### Community 13 - "pipeline.py"
Cohesion: 0.15
Nodes (18): fetch_analysis(), notify_backend_status(), Any, Persistence layer for AI analysis results. Stores per-proposal AI analyses into…, Tell the Express backend about the AI status. The backend's…, Create-or-update the analysis row. Returns the row id., safe_json(), upsert_analysis() (+10 more)

### Community 14 - "thesisController.js"
Cohesion: 0.12
Nodes (24): getDefaultComponents(), createGroup(), { assertValidStatusTransition }, audit, bcrypt, { buildThesisWhereForCoordinator, resolveCoordinatorScope, isThesisVisibleToCoordinator, canManageThesisAsCoordinator }, bulkImportPreview(), createThesis() (+16 more)

### Community 15 - "useToast"
Cohesion: 0.10
Nodes (24): ExternalEvaluationPage, SupervisorDashboard, BulkPendingUsersModal(), DESIGNATION_OPTIONS, generateEmail(), normalizeName(), GroupBulkUploadModal(), MasterThesisBulkUploadModal() (+16 more)

### Community 16 - "vector_store.py"
Cohesion: 0.11
Nodes (26): get_settings(), Factory cached by lru_cache in deps.py. Kept as a small wrapper for DI., Application settings loaded from environment variables. Environment variables…, Settings, has_stored_analysis(), _chromadb_collection(), collection_count(), _collection_name() (+18 more)

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
Cohesion: 0.07
Nodes (32): RULES, asCleanAudience(), audit, create(), deactivate(), delete(), deleteFormResponse(), finalizeFormResponse() (+24 more)

### Community 21 - "llm_factory.py"
Cohesion: 0.12
Nodes (21): Configuration module for the AI chatbot service. Loads environment variables…, LLM factory — Groq primary, NVIDIA build API fallback. Both providers are…, configure_logging(), get_logger(), Structured logging configured once and reused across the service., Initialize the root logger once. Idempotent: safe to call multiple times (e.g.…, Return a child logger with the standard configuration., create_app() (+13 more)

### Community 22 - "generate-samples.js"
Cohesion: 0.08
Nodes (22): bachelorPrograms, bachelorTemplate, bachelorTestData, externalNames, externalUsersTemplate, firstNames, fs, lastNames (+14 more)

### Community 23 - "groupController.js"
Cohesion: 0.08
Nodes (25): { assertValidStatusTransition }, audit, bcrypt, { buildGroupWhereForCoordinator, resolveCoordinatorScope, isGroupVisibleToCoordinator, canManageGroupAsCoordinator }, bulkImportPreview(), { computeCurrentYearSemesterFromBatch }, emailService, exportGroups() (+17 more)

### Community 24 - "AnalysisStatus"
Cohesion: 0.10
Nodes (21): analysis_endpoint(), health(), Inspect where the pipeline currently is for a given proposal., Return the persisted analysis result for a proposal, if any., Lightweight readiness probe used by the orchestrator., status_endpoint(), _status_or_404(), get_status() (+13 more)

### Community 25 - "studentController.js"
Cohesion: 0.10
Nodes (13): audit, fs, { getEngagement }, notifSvc, path, prisma, submitFormResponse(), triggerAIPipeline() (+5 more)

### Community 26 - "chat_agent.py"
Cohesion: 0.11
Nodes (23): get_analyzer(), get_chat_agent(), get_pipeline(), Dependency-injection helpers for FastAPI routes., Return a memoized Pipeline., Extract the bearer token from the Authorization header, if present. Used to…, resolve_auth_token(), ChatAgent (+15 more)

### Community 27 - "evaluationController.js"
Cohesion: 0.10
Nodes (23): computeSummary(), getComponentByType(), getScheme(), getTotalMaxMarks(), ROLE_LABEL, SCHEMES, validateMarks(), GROUP_STATUS (+15 more)

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
Nodes (15): authorize(), jwt, prisma, { authenticate, authorize }, departmentController, express, router, { authenticate, authorize } (+7 more)

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
Cohesion: 0.21
Nodes (12): AI_CHATBOT_URL, callChatbot(), chat(), getAnalysis(), getProposalDocumentOr403(), getStatus(), opts_timeout(), prisma (+4 more)

### Community 39 - "emailService.js"
Cohesion: 0.24
Nodes (16): assignSupervisor(), bulkAssignSupervisor(), bulkImportConfirm(), bulkImportConfirm(), buildUniversityTemplate(), nodemailer, notifyExaminerAssigned(), notifyFeedbackSubmitted() (+8 more)

### Community 40 - "Icon"
Cohesion: 0.16
Nodes (10): StudentForms, AppLayout(), LayoutContext, CommandPalette(), NotificationBell(), Sidebar(), Icon(), DEFAULT_STUDENT_FORM_FIELDS (+2 more)

### Community 41 - "aiController.js"
Cohesion: 0.26
Nodes (14): ask(), callAI(), callAIStream(), evaluate(), extractText(), fs, getStoragePath(), loadCandidates() (+6 more)

### Community 42 - "embeddings.py"
Cohesion: 0.19
Nodes (13): _dev_hash_fallback(), embed_texts(), embedding_dim_for(), force_hash_only(), _load_model(), _model_dim(), Embedding generation backed by sentence-transformers. The model is loaded once…, Return the configured/derived embedding dimensionality. (+5 more)

### Community 44 - "parseId"
Cohesion: 0.17
Nodes (12): approveLateProposal(), audit, getProposal(), logger, notifSvc, { parseId }, prisma, { PROPOSAL_STATUS } (+4 more)

### Community 45 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcryptjs, jsonwebtoken, pdf-parse, @prisma/client, puppeteer-core, xlsx, bcryptjs (+5 more)

### Community 46 - "auditService.js"
Cohesion: 0.36
Nodes (7): log(), logger, logMarks(), pendingMarksBatches, prisma, resolvePerformerProgram(), resolveProgram()

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
Cohesion: 0.20
Nodes (7): audit, { computeSummary }, logger, notifSvc, prisma, make(), ts()

### Community 51 - "authenticate"
Cohesion: 0.18
Nodes (9): authenticate(), assignmentRequestController, { authenticate, authorize }, express, router, { authenticate }, express, notificationController (+1 more)

### Community 52 - "coordinatorScope.js"
Cohesion: 0.28
Nodes (7): p, { PrismaClient }, { resolveCoordinatorScope, canManageThesisAsCoordinator, isThesisVisibleToCoordinator }, test(), isThesisVisibleToCoordinator(), prisma, IMPORTANT: Cross-program is allowed ONLY for MASTER degree-type

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
Cohesion: 0.15
Nodes (8): audit, notifSvc, prisma, audit, notifSvc, prisma, prisma, { PrismaClient }

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

### Community 78 - "supervisors.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, express, router, supervisorController

### Community 79 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Knowledge Gaps
- **509 isolated node(s):** `root`, `dist`, `node_modules`, `ecmaVersion`, `sourceType` (+504 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDefaultComponents()` connect `thesisController.js` to `emailService.js`, `announcementController.js`, `groupController.js`, `evaluationController.js`, `seed.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `resolveCoordinatorScope()` connect `resolveCoordinatorScope` to `supervisorController.js`, `emailService.js`, `thesisController.js`, `printController.js`, `userController.js`, `coordinatorScope.js`, `groupController.js`, `evaluationController.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `LLMFactory` connect `LLMFactory` to `router.py`, `test_pipeline.py`, `analyzer.py`, `llm_factory.py`, `chat_agent.py`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `root`, `dist`, `node_modules` to the rest of the system?**
  _509 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `router.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `PageLayout.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1393939393939394 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06765327695560254 - nodes in this community are weakly interconnected._