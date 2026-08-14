<div align="center">

<img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square" alt="Status"/>
<img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react" alt="React"/>
<img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite" alt="Vite"/>
<img src="https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=nodedotjs" alt="Node.js"/>
<img src="https://img.shields.io/badge/PostgreSQL-16.x-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL"/>
<img src="https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat-square&logo=prisma" alt="Prisma"/>

<br/>

# 🎓 Thesis & Project Management System (TPMS)

### Department of Electronics & Computer Engineering (DOECE)
### Pulchowk Campus — Institute of Engineering, Tribhuvan University

**A comprehensive, role-aware academic management platform designed to automate and govern the complete lifecycle of Bachelor projects (Minor/Major) and Master theses — from announcement publishing, team formation, and supervisor allocations to multi-stage defense evaluations, conflict-of-interest prevention, and official PDF grade sheet generation.**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Architectural Highlights](#-key-architectural-highlights)
- [Core Features & Modules](#-core-features--modules)
  - [1. Program Scoping & Degree Isolation](#1-program-scoping--degree-isolation)
  - [2. Bachelor Project Lifecycle (Minor / Major)](#2-bachelor-project-lifecycle-minor--major)
  - [3. Master Thesis Lifecycle](#3-master-thesis-lifecycle)
  - [4. Form Responses Matrix & Inline Finalization](#4-form-responses-matrix--inline-finalization)
  - [5. Cross-Role Faculty Utilization & Conflict-of-Interest Guard](#5-cross-role-faculty-utilization--conflict-of-interest-guard)
  - [6. Multi-Project Engagement Prevention](#6-multi-project-engagement-prevention)
  - [7. Bulk Excel Import with Anomaly Detection](#7-bulk-excel-import-with-anomaly-detection)
  - [8. Evaluation & Defense Rubrics](#8-evaluation--defense-rubrics)
  - [9. Automated PDF Generation & Printing](#9-automated-pdf-generation--printing)
  - [10. Program-Scoped Audit Trail](#10-program-scoped-audit-trail)
  - [11. Email Policy Enforcement](#11-email-policy-enforcement)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup & Seeding](#database-setup--seeding)
  - [Running Locally](#running-locally)
- [User Roles & Default Test Credentials](#-user-roles--default-test-credentials)
- [Changing the Student Email Format](#-changing-the-student-email-format)
- [API Route Reference](#-api-route-reference)
- [Project Directory Structure](#-project-directory-structure)
- [License](#-license)

---

## 📖 Overview

The **Thesis & Project Management System (TPMS)** modernizes academic administration for the **Department of Electronics and Computer Engineering (DOECE)** at Pulchowk Campus, IOE.

It provides a unified, real-time platform across **6 degree programs**:
- **Bachelor Programs**: Computer Engineering (**BCT**), Electronics, Communication & Information Engineering (**BEI**).
- **Master Programs**: Computer Systems & Knowledge Engineering (**MSCSK**), Information & Communication Engineering (**MSICE**), Data Science & Analytics (**MSDSA**), Network & Cyber Security (**MSNCS**).

---

## 🌟 Key Architectural Highlights

```mermaid
graph TD
    A[Coordinator Announcement] -->|allowGroupFormation: true| B[Bachelor Group Formation / Proposal PDF]
    A -->|formEnabled: true| C[Master Thesis Proposal Form]
    
    B --> D[Bachelor ProjectGroup: Max 4 Students]
    C --> E[Master Thesis: 1 Student]
    
    D --> F[Coordinator Responses Matrix: Deduplicated 1 Row/Group]
    E --> F
    
    F -->|Finalize Group| G[Active ProjectGroup: /coordinator/project/group/:id]
    F -->|Finalize Thesis| H[Active Thesis: /coordinator/project/thesis/:id]
    
    G --> I[Evaluation Scheme: MINOR 50 / MAJOR 100]
    H --> J[Evaluation Scheme: MASTER 300]
```

- **Global Engagement Guard**: Enforces database-wide constraints ensuring a student can never be part of multiple active project groups or theses simultaneously.
- **Form Responses Matrix Deduplication**: Group submissions display as a single consolidated row with all members, supervisor matching, and cluster assignments.
- **Capability-Based Multi-Role Faculty**: Enables teachers to supervise their assigned students and act as internal/external examiners for other colleagues' projects under a single university account.
- **Automated Conflict-of-Interest Filter**: Prevents a teacher from being assigned as the examiner on a project they already supervise.
- **Research Cluster Integration**: Full lifecycle tracking across specialized research clusters (`AIML`, `IPCV`, `ANLP`, `NTS`, `EDMES`, `ACOM`, `EII`, etc.).
- **Program-Scoped Audit Trail**: Every audit event is tagged with the program it belongs to; coordinators see only their own program's audit history.
- **Bulk Evaluation PDF Export**: Select any set of groups or theses and download a single combined PDF of official evaluation sheets.

---

## 🚀 Core Features & Modules

### 1. Program Scoping & Degree Isolation
- **Bachelor Coordinators**: Strictly scoped to their own department program (e.g., BCT coordinator only oversees BCT projects).
- **Master Coordinators**: Department-level cross-program coordination across all Master specializations.
- **DegreeGuard Component**: Protects frontend routes against cross-degree navigation.
- **Scoped Dashboards & Queues**: Coordinator dashboard stats and pending/late proposal queues are restricted to the coordinator's own program.

### 2. Bachelor Project Lifecycle (`MINOR` / `MAJOR`)
- **Team Size**: 1 to 4 students from the same academic program.
- **Compulsory Proposal PDF**: Required during team formation.
- **Member Management**: Coordinators can add or remove members with live auto-complete search and 4-member limit enforcement.
- **Defense Milestones**: Proposal Defense, Mid-Term Defense, and Final Defense with Internal Examiner evaluation.

### 3. Master Thesis Lifecycle
- **Single-Student Model**: 1 student per thesis.
- **Dual External Examiners**:
  - `externalMidTermId`: External examiner for Literature Review and Methodology Defense.
  - `externalFinalId`: External examiner for Final Defense, Report Quality, and Viva.
- **Cross-Program Supervision**: Allows faculty across the department to supervise Master theses in allied specializations.

### 4. Form Responses Matrix & Inline Finalization
- **Group Deduplication**: Bachelor groups display as 1 unified row instead of duplicate rows per student.
- **1-Click Fuzzy Matching**: Matches student supervisor preferences to active faculty members.
- **Inline Editing**: Live editing of Project Title, Research Cluster, Remarks, and Supervisor.
- **Automatic Lifecycle Activation**: Finalization generates default evaluation criteria, approves proposal documents, and links to project management views.

### 5. Cross-Role Faculty Utilization & Conflict-of-Interest Guard
- Faculty members can serve as **Coordinator**, **Supervisor**, and **Examiner** on different projects without separate accounts.
- **Conflict Prevention**: Examiner dropdowns automatically exclude the project's assigned supervisor.
- **Examinations Hub**: Dedicated navigation for faculty to review assigned peer projects.

### 6. Multi-Project Engagement Prevention
- Integrated `engagementGuard` prevents:
  - Inviting students already in an active project.
  - Accepting an invitation if engaged in another project.
  - Submitting duplicate group forms.
  - Adding active students during coordinator manual creation.

### 7. Bulk Excel Import with Anomaly Detection
- **Templates**: Standardized templates with optional `Cluster` column (`bachelor_upload_template.xlsx` and `master_upload_template.xlsx`).
- **Anomaly Detection**: Flags intra-file duplicates, students already engaged in the database, and unassigned faculty before database insertion.

### 8. Evaluation & Defense Rubrics

| Degree / Project Type | Total Marks | Evaluator Breakdown |
| :--- | :--- | :--- |
| **Minor Project** | **50 Marks** | Supervisor (25), Proposal Defense (5), Mid-Term Defense (5), Final Defense (5), Internal Examiner (10) |
| **Major Project** | **100 Marks** | Supervisor (50), Proposal Defense (10), Mid-Term Defense (10), Final Defense (10), Internal Examiner (20) |
| **Master Thesis** | **300 Marks** | Supervisor (100 Marks / 5 criteria), External Mid-Term (100 Marks / 5 criteria), External Final (100 Marks / 5 criteria) |

### 9. Automated PDF Generation & Printing
- Official A4 grade sheets branded for **Institute of Engineering, Pulchowk Campus**.
- Automatic number-to-words mark conversion, student rosters, supervisor/examiner designations, and signature panels.
- **Bulk Download**: Select multiple groups or theses and export one combined PDF — each evaluation sheet is page-separated and filtered to the caller's access scope.

### 10. Program-Scoped Audit Trail
- **Automatic Program Tagging**: Every audit entry is resolved to the program it belongs to — by item (Thesis/Group/Proposal/Evaluation), by user, by failed-login email, or by the performer.
- **Coordinator Scoping**: Coordinators only see audit logs for their own program; department/system-level events remain visible to the Maintainer.
- **Document View Tracking**: Staff (coordinator/supervisor/examiner) downloads of proposal PDFs are recorded as `VIEW` events on the audit trail.
- **UI**: The Audit Log page shows the owning Program for each entry.

### 11. Email Policy Enforcement
- **Students**: Emails are always auto-generated as `{rollNumber}@pcampus.edu.np` — any typed email is ignored on create, update, and bulk import.
- **Coordinators / Supervisors / External Examiners**: Emails must end with `@pcampus.edu.np` (local part is free-form, e.g. `ram.yadav@pcampus.edu.np`); other domains are rejected.
- See [Changing the Student Email Format](#-changing-the-student-email-format) to customize the student format.

---

## 🛠 Tech Stack

### Frontend
- **React 18** (Functional components, custom hooks, context providers)
- **Vite 5** (Fast HMR & optimized production bundling)
- **React Router v6** (Role-guarded client-side routing)
- **Axios** (HTTP client with auth interceptors)
- **CSS Variables Design System** (DOECE Academic Blue palette, responsive layouts)
- **Material Symbols & Google Fonts** (Inter & DM Sans)

### Backend
- **Node.js & Express** (RESTful API architecture)
- **PostgreSQL 16** (Relational database)
- **Prisma 5 ORM** (Type-safe schema, migrations, transactions)
- **JWT & bcryptjs** (Secure authentication & token management)
- **Puppeteer** (Server-side PDF grade sheet generation)
- **Multer** (Proposal & report document storage)
- **xlsx (SheetJS)** (Excel template generation and bulk parsing)

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 18 + Vite (Frontend)               │
│  /coordinator/*   /supervisor/*   /student/*   /external/*  │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (Bearer JWT)
┌──────────────────────────────▼──────────────────────────────┐
│                    Express.js REST API Server                │
│  ├── /api/auth               ├── /api/groups                │
│  ├── /api/announcements      ├── /api/theses                │
│  ├── /api/student-groups     ├── /api/evaluations           │
│  ├── /api/users              ├── /api/print                 │
│  └── /api/external-examiners └── /api/proposals             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma ORM 5
┌──────────────────────────────▼──────────────────────────────┐
│                     PostgreSQL 16 Database                  │
│  User • Department • Program • ProjectGroup • GroupMember   │
│  Thesis • Proposal • EvaluationComponent • Evaluation       │
│  ExaminerAssignment • GroupInvitation • FormResponse        │
│  AuditLog • Announcement • Recommendation • Document        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14.x
- **npm** or **yarn**
- **Chromium / Google Chrome** (for PDF generation via Puppeteer)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/subeshyadav3/project-thesis_MIS.git
cd project-thesis_MIS

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
```

### Environment Configuration

Create `.env` in `backend/` and `frontend/`:

**`backend/.env`**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thesis_management?schema=public"
JWT_SECRET="your-secure-jwt-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000

# Optional SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000/api
```

### Database Setup & Seeding

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Apply Database Migrations
npx prisma migrate dev --name init

# Seed Database with sample DOECE users & programs
npm run prisma:seed

# Generate sample Excel upload templates
node scripts/generate-samples.js
```

### Running Locally

```bash
# Terminal 1: Start Backend API
cd backend
npm run dev

# Terminal 2: Start Frontend Application
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 👥 User Roles & Default Test Credentials

All seeded test accounts use the password: **`subesh`**

| Role | Email | Scope / Responsibility |
| :--- | :--- | :--- |
| **Maintainer** | `subeshgaming@gmail.com` | Full department administration & system configuration |
| **BCT Coordinator** | `bct.coordinator@pcampus.edu.np` | Computer Engineering Bachelor project coordinator |
| **BEI Coordinator** | `bei.coordinator@pcampus.edu.np` | Electronics & Information Bachelor project coordinator |
| **MSNCS Coordinator** | `msncs.coordinator@pcampus.edu.np` | Master Network & Cyber Security coordinator |
| **Faculty / Supervisor** | `bishnu.tamang@pcampus.edu.np` | Faculty Supervisor & Peer Examiner |
| **Faculty / Supervisor** | `sita.devi@pcampus.edu.np` | Faculty Supervisor & Peer Examiner |
| **External Examiner** | `kiran.mainali@ioe.edu.np` | External Defense Committee Examiner |
| **Bachelor Student** | `080bct001@pcampus.edu.np` | Bachelor 4th Year Student (BCT) |
| **Bachelor Student** | `080bei001@pcampus.edu.np` | Bachelor 3rd Year Student (BEI) |
| **Master Student** | `080msncs001@pcampus.edu.np` | Master 2nd Year Student (MSNCS) |

---

## 🔧 Changing the Student Email Format

Student emails are **always auto-generated from the roll number** — any email typed in the UI/import is ignored. The default format is:

```
{rollNumber}@pcampus.edu.np
```

Example: `080BCT001` → `080bct001@pcampus.edu.np`

### Where the format is defined

Each location has a `// ── STUDENT EMAIL FORMAT` comment marking the exact line to edit:

| File | Location | Flow |
| :--- | :--- | :--- |
| `backend/src/controllers/userController.js` | `createUser` (~line 105) | Manual user creation (maintainer/coordinator) |
| `backend/src/controllers/userController.js` | `updateUser` (~line 237) | Editing an existing student |
| `backend/src/controllers/userController.js` | `bulkCreateUsers` (~line 499) | `/api/users/bulk` JSON import |
| `backend/src/controllers/userController.js` | `bulkImportUsersExcel` (~line 643) | `/api/users/bulk-import` Excel import |
| `backend/src/controllers/groupController.js` | line 129 & 558 | Group formation / bulk groups |
| `backend/src/controllers/thesisController.js` | line 459 | Master thesis bulk import (auto-creates students) |

### Changing it to `{rollNumber}.{firstName}@pcampus.edu.np`

At each site, replace the current line with:

```js
email = `${rollNumber.toLowerCase()}.${(firstName || '').toLowerCase().replace(/[^a-z]/g, '')}@pcampus.edu.np`;
```

- The roll may be typed in **any case**; it is lowercased for consistency.
- Non-letter characters in the first name are stripped (`Ram` → `ram`).

Validation regex for that format:

```
/^[a-z0-9]+\.[a-z]+@pcampus\.edu\.np$/i
```

Example: roll `080BCT001` + first name `Ram` → `080bct001.ram@pcampus.edu.np`

### ⚠️ Keep lookups in sync

`groupController.js` looks up students by constructing the same email string. If you change the format in `userController.js`, also update the matching lines in `groupController.js` and `thesisController.js` (see table above), otherwise student lookups / auto-creates will break.

Existing users already in the database keep their old email — update them manually (or via SQL) if existing students must use the new format.

---

## 📡 API Route Reference

| Module | Route Prefix | Key Capabilities |
| :--- | :--- | :--- |
| **Authentication** | `/api/auth` | Login, current user session, password reset |
| **Announcements** | `/api/announcements` | Notice publishing, dynamic forms, responses matrix, finalize, delete |
| **Student Groups** | `/api/student-groups` | Self-service group formation, invitations, join open groups, proposals |
| **Bachelor Groups** | `/api/groups` | Coordinator group management, member add/remove, bulk Excel import |
| **Master Theses** | `/api/theses` | Master thesis management, dual external examiner allocation, bulk import |
| **Evaluations** | `/api/evaluations` | Component criteria grading, defense marks entry, summary computation |
| **Examinations** | `/api/external-examiners` | Assigned groups/theses review for internal and external examiners |
| **PDF & Export** | `/api/print` | University evaluation sheet PDF generation, Excel grade sheet export, bulk PDF download (`POST /bulk-pdf`) |
| **User Directory** | `/api/users` | Student, supervisor, and examiner directory management, program-scoped audit logs (`GET /audit-logs`), bulk Excel import |

---

## 📁 Project Directory Structure

```
se/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # PostgreSQL relational schema
│   │   ├── seed.js                  # Database seeder
│   │   └── migrations/              # Prisma migration history
│   ├── src/
│   │   ├── index.js                 # Express server bootstrap
│   │   ├── controllers/             # REST API controllers
│   │   ├── routes/                  # Express route definitions
│   │   ├── middleware/              # Authentication & authorization guards
│   │   ├── services/                # Notification, audit, engagement & PDF services
│   │   ├── config/                  # Evaluation rubrics & batch calculations
│   │   └── utils/                   # Prisma client & coordinator scoping helpers
│   ├── excel-templates/             # Pre-built Excel import templates (.xlsx)
│   ├── scripts/                     # Sample data and template generators
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main router with role-based private routes
│   │   ├── components/              # Sidebar, Navbar, DegreeGuard, Skeletons
│   │   ├── pages/
│   │   │   ├── coordinator/         # BachelorProjects, MasterThesis, Announcements, Matrix
│   │   │   ├── supervisor/          # SupervisedProjects, SupervisedTheses, ProjectDetail
│   │   │   ├── student/             # Groups, Theses, Submissions, Assignment
│   │   │   ├── external/            # EvaluationsList, ExternalEvaluationPage
│   │   │   └── maintainer/          # UserManagement, DepartmentManagement
│   │   ├── services/                # Axios API instance with interceptors
│   │   └── styles/                  # Global CSS tokens, Bento grids, badges
│   ├── public/                      # Static assets & downloadable Excel templates
│   └── package.json
│
└── README.md
```

---

## 📄 License

Developed for the academic and administrative workflows of the **Department of Electronics and Computer Engineering (DOECE)**, Pulchowk Campus, Institute of Engineering, Tribhuvan University.

<div align="center">
  <sub>Thesis & Project Management System (TPMS) © 2026</sub>
</div>
