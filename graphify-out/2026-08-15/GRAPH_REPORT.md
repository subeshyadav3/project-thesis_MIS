# Graph Report - se  (2026-08-15)

## Corpus Check
- 194 files · ~601,618 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1524 nodes · 3091 edges · 105 communities (89 shown, 16 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e76d9a7`
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
- llm_factory.py
- thesisController.js
- useToast
- vector_store.py
- printController.js
- userController.js
- generate-new-test-data.js
- announcementController.js
- embeddings.py
- generate-samples.js
- groupController.js
- pipeline.py
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
- notificationController.js
- logger.js
- cookie-parser
- express
- mammoth
- multer
- nodemailer
- pdfkit
- test-all-flows.js
- evaluations.js
- cors
- axios
- dotenv

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 85 edges
2. `Icon()` - 55 edges
3. `resolveCoordinatorScope()` - 42 edges
4. `api` - 35 edges
5. `LLMFactory` - 26 edges
6. `canManageThesisAsCoordinator()` - 26 edges
7. `PageLayout()` - 23 edges
8. `authenticate()` - 23 edges
9. `canManageGroupAsCoordinator()` - 21 edges
10. `parseId()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `attachComponents()` --calls--> `getDefaultComponents()`  [EXTRACTED]
  backend/prisma/seed.js → backend/src/config/evaluationScheme.js
- `CoordinatorAnnouncements()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/coordinator/Announcements.jsx → frontend/src/contexts/ToastContext.jsx
- `StudentForms()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/student/Forms.jsx → frontend/src/contexts/ToastContext.jsx
- `ProjectDetail()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/supervisor/ProjectDetail.jsx → frontend/src/contexts/ToastContext.jsx
- `ChatAgent` --uses--> `LLMFactory`  [INFERRED]
  ai_chatbot/core/chat_agent.py → ai_chatbot/core/llm_factory.py

## Import Cycles
- None detected.

## Communities (105 total, 16 thin omitted)

### Community 0 - "router.py"
Cohesion: 0.07
Nodes (65): analyze(), ask_endpoint(), ask_stream_endpoint(), candidates_endpoint(), chat(), chat_stream(), _clamp_score(), embed_endpoint() (+57 more)

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
Cohesion: 0.12
Nodes (31): _build_synthetic_doc(), Wrap text into the ProcessedDocument shape analyzers expect., embed_text(), Single-text convenience wrapper. Returns a single vector., _build_url(), chunk_text(), clean_extracted_text(), extract_text_from_bytes() (+23 more)

### Community 5 - "🎓 Thesis & Project Management System (TPMS)"
Cohesion: 0.05
Nodes (36): 10. Program-Scoped Audit Trail, 11. Email Policy Enforcement, 1. Program Scoping & Degree Isolation, 2. Bachelor Project Lifecycle (`MINOR` / `MAJOR`), 3. Master Thesis Lifecycle, 4. Form Responses Matrix & Inline Finalization, 5. Cross-Role Faculty Utilization & Conflict-of-Interest Guard, 6. Multi-Project Engagement Prevention (+28 more)

### Community 6 - "ProcessedDocument"
Cohesion: 0.10
Nodes (22): get_analyzer(), get_chat_agent(), get_pipeline(), Dependency-injection helpers for FastAPI routes., Return a memoized Pipeline., Extract the bearer token from the Authorization header, if present. Used to…, resolve_auth_token(), notify_backend_status() (+14 more)

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
Nodes (21): _coerce_json(), _fallback_provider(), LLMAuthError, LLMFactory, LLMOutputError, LLMUnavailableError, Any, RuntimeError (+13 more)

### Community 13 - "llm_factory.py"
Cohesion: 0.07
Nodes (37): analysis_endpoint(), Return the persisted analysis result for a proposal, if any., fetch_analysis(), Any, Persistence layer for AI analysis results. Stores per-proposal AI analyses into…, Create-or-update the analysis row. Returns the row id., safe_json(), upsert_analysis() (+29 more)

### Community 14 - "thesisController.js"
Cohesion: 0.13
Nodes (23): getDefaultComponents(), createGroup(), { assertValidStatusTransition }, audit, bcrypt, { buildThesisWhereForCoordinator, resolveCoordinatorScope, isThesisVisibleToCoordinator, canManageThesisAsCoordinator }, bulkImportConfirm(), bulkImportPreview() (+15 more)

### Community 15 - "useToast"
Cohesion: 0.09
Nodes (25): ExternalDashboard, ExternalEvaluationPage, StudentGroups, ExaminerAssignmentSection(), ExternalExaminerSection(), ProposalsSection(), SupervisorAssignmentSection(), useToast() (+17 more)

### Community 16 - "vector_store.py"
Cohesion: 0.09
Nodes (33): get_settings(), Factory cached by lru_cache in deps.py. Kept as a small wrapper for DI., Application settings loaded from environment variables. Environment variables…, Settings, Dump chunks to a file. Used by tests; safe to call with empty iter., A single chunk with text and provenance., save_chunks_to_disk(), TextChunk (+25 more)

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

### Community 24 - "pipeline.py"
Cohesion: 0.15
Nodes (15): Inspect where the pipeline currently is for a given proposal., status_endpoint(), _status_or_404(), _average_vector(), get_status(), End-to-end pipeline orchestration: fetch → extract → clean → chunk → embed →…, get_tracker(), In-process status tracker for the analyze pipeline. Each proposal has a single-… (+7 more)

### Community 25 - "studentController.js"
Cohesion: 0.10
Nodes (13): audit, fs, { getEngagement }, notifSvc, path, prisma, submitFormResponse(), triggerAIPipeline() (+5 more)

### Community 26 - "chat_agent.py"
Cohesion: 0.16
Nodes (13): ChatAgent, _format_context(), _format_history(), RAG chat agent. Retrieves relevant chunks for the question, builds a context…, Non-streaming answer., Async generator yielding (delta, None) chunks and a final (None, result) at end., Compact conversation history format. Limit to last 6 turns., Build the numbered context block the prompt expects. Returns the formatted… (+5 more)

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
Cohesion: 0.20
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
Cohesion: 0.13
Nodes (7): audit, notifSvc, prisma, audit, prisma, prisma, { PrismaClient }

### Community 44 - "parseId"
Cohesion: 0.18
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
Cohesion: 0.19
Nodes (10): audit, notifSvc, prisma, log(), logger, logMarks(), pendingMarksBatches, prisma (+2 more)

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
Nodes (16): _band_for(), _coerce_analysis(), fallback_analysis(), _map_criteria(), Any, Document analyzer. Runs the LLM in a single call that returns summary +…, Deterministic placeholder output. Keeps the pipeline alive even if Groq is…, Map raw LLM JSON output into the typed ``DocumentAnalysis`` shape. Resilient:… (+8 more)

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
Cohesion: 0.25
Nodes (5): audit, { computeSummary }, logger, notifSvc, prisma

### Community 102 - "test-all-flows.js"
Cohesion: 0.40
Nodes (5): assert(), axios, bcrypt, prisma, runTests()

### Community 103 - "evaluations.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize }, evaluationController, express, router

## Knowledge Gaps
- **516 isolated node(s):** `{ PrismaClient }`, `bcrypt`, `path`, `{ getDefaultComponents }`, `prisma` (+511 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `authenticate()` connect `authenticate` to `middleware/auth.js`, `theses.js`, `files-audit.js`, `index.js`, `proposalComments.js`, `users.js`, `evaluations.js`, `forward.js`, `print.js`, `proposals.js`, `studentGroups.js`, `examinerAssignments.js`, `students.js`, `chatbot.js`, `supervisors.js`, `ai.js`, `routes/auth.js`, `groups.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `resolveCoordinatorScope()` connect `resolveCoordinatorScope` to `supervisorController.js`, `coordinatorScope.js`, `emailService.js`, `thesisController.js`, `userController.js`, `groupController.js`, `evaluationController.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `Icon`, `App.jsx`, `ErrorBoundary`, `PageLayout`, `Forms.jsx`, `ProjectDetail.jsx`, `api.jsx`, `UserManagement.jsx`, `ProposalsSection.jsx`, `Announcements.jsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `{ PrismaClient }`, `bcrypt`, `path` to the rest of the system?**
  _516 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `router.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06829488919041157 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08266129032258064 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._