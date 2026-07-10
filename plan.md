# Minor Project Improvement Plan — TPMS

> Comprehensive analysis + stepwise implementation for the multi-role
> Thesis/Project Management System at IOE Pulchowk.

---

## 1. Issues Identified (logical / UX / data / workflow)

| Area | Symptom | Severity |
|------|---------|----------|
| Data integrity | Master thesis Excel upload created emails `@university.edu` while bachelor upload uses `@pcampus.edu.np` | High |
| Portability | `printController.js` hardcoded the Puppeteer Chrome path to `C:\Program Files\…`, crashes on Linux/Docker/minimal servers | High |
| Mobile UX | 80 KB+ monolith `App.css`, mobile drawer overlap, no live polling of notifications | Medium |
| Data integrity | Group member removal didn't respect the announcement's `groupSizeMin` | Medium |
| Workflow gap | `Recommendation` model existed but had zero UI; supervisors couldn't issue letters, students couldn't read them | High |
| AI quality | Summarize prompt was hardcoded; evaluation criteria had presets but no user-defined prompts; similarity only "all-vs-all" with no useful scope; missing fallback message when AI key absent | Medium |
| Logic bug | `studentController.getMyNotifications` / `markNotificationRead` were declared but not wired into the dedicated `/notifications` controller — duplicates & drift risk | Low |
| Logic bug | `NotificationBell` invoked `handleMarkRead` on already-read notifications — needless network chatter | Low |
| Modeling | `Proposal` was reused as a generic document; type was implicit. Made generic with `documentType` enum and `DocumentEmbedding` 1-1 | Medium |

---

## 2. Implementation Plan (executed on `minor-project-improvements` branch)

### Phase 1 — Backend hardening
- [x] Standardize Excel-imported student emails to `@pcampus.edu.np` (`thesisController.js`).
- [x] Make Puppeteer Chrome path discoverable (`PUPPETEER_EXECUTABLE_PATH` → `CHROME_PATH` → platform candidates).
- [x] Fix missing `getMyNotifications` / `markNotificationRead` exports in `studentController.js`.
- [x] Implement `DELETE /students/groups/:groupId/members/:studentId` with announcement min-size guard.

### Phase 2 — Recommendations UI
- [x] Backend returns `recommendations` on the Group/Thesis record — already true.
- [x] Student `Assignment.jsx`: render a "Recommendations from Supervisor" card with date and content.
- [x] Supervisor `ProjectDetail.jsx`: added a "Recommendations" tab with issue-letter form (textarea) and a list of previously issued letters.

### Phase 3 — Notifications live updates
- [x] `NotificationBell`: poll every 15s; refresh on `window.focus`; guard against re-marking read items.

### Phase 4 — AI microservice + bridge
- [x] `core/llm_factory.py`: clear `RuntimeError` when `NVIDIA_API_KEY` missing instead of opaque 500.
- [x] **Embeddings** — new `core/embeddings.py`: chunking, average-pooling, deterministic hash fallback (dev/CI safe), NVIDIA NV-Embed calls when key present.
- [x] **Similarity** — new `core/similarity.py` and `POST /api/ai/similarity` (cosine, top-K, threshold).
- [x] **Scope-aware candidates** — `GET /api/ai/candidates/:id?scope=all|year|department|year_department`.
- [x] **Custom prompt** for summarize; **custom instructions** for evaluate.
- [x] `Proposal.documentType` enum-driven (`PROPOSAL`, `MID_TERM_REPORT`, `FINAL_REPORT`, `THESIS_DRAFT`, `THESIS_FINAL`, `OTHER`).
- [x] `DocumentEmbedding` model (1-1 with `Proposal`), background-embedded on upload (don't block the user).
- [x] Frontend `AiAssistantModal` now ships with: custom-prompt summary, custom-instructions evaluation, scope-based similarity. Similarity is gated to COORDINATOR/SUPERVISOR.

---

## 3. Logical issues remaining / proposed plan (next iteration)

1. **Auth double-check on `ai/similarity`**: students currently cannot run similarity (good), but supervisor shouldn't see cross-department documents. Add a department-scope guard to `aiController.listCandidates`.
2. **Embedding rebuild policy**: when a document is replaced, the old embedding should be invalidated. Currently we upsert, so the stale vector is overwritten — fine, but should also prune for deleted `Proposal` rows. Add `onDelete: Cascade` (already in schema, OK).
3. **Rate-limiting AI calls**: add `express-rate-limit` per user inside `/api/ai/*`.
4. **Streaming responses**: long LLM responses currently buffer; consider SSE for better UX.
5. **Group formation audit**: `studentGroupController.create` writes an audit log but doesn't notify each invited student; only the inviter gets a response. Add `notifyMany(studentIds, 'GROUP_INVITATION', …)`.
6. **Notification cleanup**: old notifications never expire. Add a backend cron or `DELETE /notifications` endpoint scoped to `read=true AND createdAt < NOW() - INTERVAL '30 days'`.
7. **Excel import — name collision**: if two rows have the same `Member Names` but different roll, we match by `lastName/firstName` and could pick the wrong one. Tie-break by `programId` or require unique email.
8. **PDF print** in `printController.completeness`: missing per-criterion columns for the bachelor project; current scheme works but date formatting is `toLocaleDateString('en-US')` — should match the institutional Nepali BS year.
9. **Frontend `App.css` modularization**: split into `styles/base.css`, `styles/components.css`, `styles/layouts.css`, `styles/pages.css`.
10. **Toast context**: error toast on every 401 is hard-coded to redirect to `/login`. Add a "remember me" extension (currently an unchecked `defaultChecked`).
11. **Reset password flow**: tokens are returned in plaintext via the API for dev. Production needs an email transport (Nodemailer) — `emailService` exists, but the forgot-password handler doesn't call it.
12. **`/api/upload/proposal` route** in `index.js` uses `multer.memoryStorage` inline — same logic exists in `students.js` route with `diskStorage`. Consolidate.
13. **`evaluations/group/:id`** route is reachable by anyone authenticated (no role guard) — should restrict to involved actors.
14. **`/api/files/:type/:filename`** allows any authed user to download. Bypass risk: a leaked link lets any logged-in student download other groups' files via manipulation. Switch to per-request signed URLs or scoped lookup.
15. **AI `embed` background job**: on failure we silently log the error. Add a small retry (up to 3) and a `embeddings.status: 'PENDING' | 'OK' | 'FAILED'`.

---

## 4. Branch / commit checklist

```bash
# Feature branch (already created)
git checkout minor-project-improvements

# Future verification
cd backend && npx prisma db push && node prisma/seed.js   # refresh schema
cd frontend && npm run dev
cd ../ai && uvicorn main:app --port 8001 --reload
```
