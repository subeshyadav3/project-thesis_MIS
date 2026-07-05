# Thesis / Project Management System — IOE, Pulchowk Campus

A full-stack web application for managing bachelor project groups and master's theses at the **Institute of Engineering, Pulchowk Campus (Tribhuvan University)**. Features role-based access, supervisor & external examiner assignment, evaluation tracking (proposal/mid-term/final), proposal management, file uploads, email notifications, and Excel bulk import.

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | React 18 + Vite         |
| Backend  | Node.js + Express       |
| Database | PostgreSQL + Prisma ORM |
| Auth     | JWT (JSON Web Token)    |

## Modules

- **Maintainer** — User management, department & academic year configuration
- **Coordinator** — Dashboard, bachelor project & master thesis oversight, evaluation component creation, supervisor & external examiner assignment, bulk import
- **Supervisor** — Dashboard, project/thesis detail view with evaluation & feedback, proposal review
- **Student** — Dashboard, view assigned projects/theses, submit proposals, view evaluations & recommendations
- **External Examiner** — Dashboard, evaluate assigned groups/theses, submit marks

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL running on `localhost:5432`
- A database named `thesis_management`

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env    # Configure your DATABASE_URL and other vars

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

```bash
cd backend
npx prisma db push              # Push schema to PostgreSQL
node prisma/seed.js             # Seed with sample data
```

### 3. Run

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 4. Login Credentials (from seed)

| Role             | Email                              | Password |
| ---------------- | ---------------------------------- | -------- |
| MAINTAINER       | subeshgaming@gmail.com             | subesh   |
| COORDINATOR      | coordinator@pcampus.edu.np         | subesh   |
| SUPERVISOR       | prabeshbchettri25@gmail.com        | subesh   |
| EXTERNAL_EXAMINER | external@pcampus.edu.np           | subesh   |
| Any Student      | `<roll>@pcampus.edu.np`           | subesh   |

Example student login: `078bct001@pcampus.edu.np` / `subesh`

## API Overview

Base URL: `http://localhost:5000/api`

### Auth
- `POST /auth/login` — Login, returns JWT + user
- `POST /auth/change-password` — Change user password

### Users
- `GET /users` — List all users
- `GET /users/role/:role` — Filter by role (supervisor, student, etc.)
- `POST /users` — Create user
- `PUT /users/:id` — Update user
- `DELETE /users/:id` — Delete user

### Groups (Bachelor Projects)
- `GET /groups` — All groups with members, supervisor, evaluations
- `GET /groups/:id` — Single group with full relations
- `POST /groups` — Create group (optional `students` array with firstName/lastName/rollNumber)
- `POST /groups/upload` — Bulk import via Excel (columns: Group Name, Project Title, Member Names, Roll Numbers)
- `PUT /groups/:id/supervisor` — Assign/reassign supervisor
- `PUT /groups/:id/status` — Update group status

### Theses (Master)
- `GET /theses` — All theses
- `GET /theses/:id` — Single thesis with full relations
- `POST /theses` — Create thesis
- `POST /theses/upload` — Bulk import via Excel (columns: Project Title, Member Names, Roll Numbers)
- `PUT /theses/:id/supervisor` — Assign/reassign supervisor

### Evaluations
- `GET /evaluations/groups` — Evaluations for bachelor groups
- `GET /evaluations/theses` — Evaluations for theses
- `GET /evaluations/:id` — Single evaluation detail
- `POST /evaluations` — Submit evaluation
- `PUT /evaluations/:id` — Update evaluation
- `GET /evaluations/components/group/:groupId` — Evaluation components for a group
- `GET /evaluations/components/thesis/:thesisId` — Evaluation components for a thesis
- `POST /evaluations/components` — Create evaluation component
- `DELETE /evaluations/components/:id` — Delete evaluation component

### Departments
- `GET /departments` — List departments
- `POST /departments` — Create department
- `PUT /departments/:id` — Update department
- `DELETE /departments/:id` — Delete department
- `GET /departments/academic-years` — Academic years
- `POST /departments/academic-years` — Create academic year
- `PUT /departments/academic-years/:id` — Update academic year
- `PUT /departments/academic-years/:id/activate` — Activate an academic year

### Supervisors
- `GET /supervisors/groups` — Supervisor's assigned groups
- `GET /supervisors/theses` — Supervisor's assigned theses

### Students
- `GET /students/groups` — Student's groups
- `GET /students/theses` — Student's theses
- `GET /students/:id` — Get student by ID
- `DELETE /students/groups/:groupId/members/:studentId` — Remove member from group

### Notifications
- `GET /notifications` — List user notifications
- `PUT /notifications/:id/read` — Mark notification as read
- `PUT /notifications/read-all` — Mark all as read

### External Examiners
- `GET /external-examiners` — List external examiners
- `POST /external-examiners` — Create external examiner
- `PUT /external-examiners/:id` — Update external examiner
- `DELETE /external-examiners/:id` — Delete external examiner

### Examiner Assignments
- `GET /examiner-assignments` — List examiner assignments
- `POST /examiner-assignments` — Assign examiner to group/thesis
- `DELETE /examiner-assignments/:id` — Remove assignment

### Proposals
- `GET /groups/:id/proposals` — List proposals for a group
- `GET /theses/:id/proposals` — List proposals for a thesis
- `POST /proposals` — Submit proposal
- `PUT /proposals/:id/review` — Review proposal (supervisor)

### Recommendations
- `GET /groups/:id/recommendations` — Recommendations for a group
- `GET /theses/:id/recommendations` — Recommendations for a thesis
- `POST /recommendations` — Issue recommendation

### Other
- `GET /stats` — Dashboard statistics (counts by role, status, department)
- `GET /health` — Health check endpoint
- `GET /files/:type/:filename` — Serve uploaded files (groups/theses)

## Environment Variables

| Variable              | Description                    | Default                              |
| --------------------- | ------------------------------ | ------------------------------------ |
| `DATABASE_URL`        | PostgreSQL connection string   | `postgresql://postgres:postgres@localhost:5432/thesis_management` |
| `JWT_SECRET`          | JWT signing secret             |                                      |
| `JWT_EXPIRES_IN`      | JWT expiration duration        | `7d`                                 |
| `PORT`                | Backend server port            | `5000`                               |
| `FRONTEND_URL`        | CORS origin                    | `http://localhost:3000`              |
| `SMTP_HOST`           | SMTP server                    | `smtp.gmail.com`                     |
| `SMTP_PORT`           | SMTP port                      | `587`                                |
| `SMTP_USER`           | SMTP email                     |                                      |
| `SMTP_PASS`           | SMTP app password              |                                      |
| `EMAIL_FROM`          | Sender email address           | `University Thesis Management <noreply@university.edu>` |
| `EXAM_DEPT_API_URL`   | External exam dept API         |                                      |

## Project Structure

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema (10 models)
│   │   └── seed.js                 # Sample data seeder
│   ├── src/
│   │   ├── config/
│   │   │   └── evaluationScheme.js # Evaluation scheme configuration
│   │   ├── controllers/            # Route handlers (12 files)
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT auth & role middleware
│   │   ├── routes/                 # Express routes (12 files)
│   │   ├── services/
│   │   │   ├── emailService.js     # Nodemailer integration
│   │   │   └── notificationService.js # In-app notifications
│   │   └── index.js                # Express entry point
│   ├── storage/
│   │   ├── groups/                 # Uploaded group files
│   │   └── theses/                 # Uploaded thesis files
│   ├── scripts/
│   │   └── generate-samples.js     # Regenerate sample xlsx files
│   ├── sample_bachelor_projects.xlsx
│   ├── sample_master_theses.xlsx
│   ├── generate_sample_excel.js
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   └── src/
│       ├── components/             # Shared components (8 files)
│       │   ├── Sidebar.jsx
│       │   ├── PageLayout.jsx
│       │   ├── PrivateRoute.jsx
│       │   ├── NotificationBell.jsx
│       │   ├── Pagination.jsx
│       │   ├── DocumentViewer.jsx
│       │   ├── ProposalsSection.jsx
│       │   └── ExaminerAssignmentSection.jsx
│       ├── contexts/
│       │   └── ToastContext.jsx    # Toast notification context
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Profile.jsx
│       │   ├── maintainer/        # Dashboard, UserManagement, DepartmentManagement
│       │   ├── coordinator/       # Dashboard, BachelorProjects, MasterThesis, Evaluations, SupervisorList, ExaminerList
│       │   ├── supervisor/        # Dashboard, BachelorProjects, MasterThesis, ProjectDetail
│       │   ├── student/           # Dashboard, Projects, Theses, Assignment, Submissions, Notifications
│       │   └── external/          # Dashboard, EvaluationsList, EvaluationPage
│       ├── services/
│       │   └── api.jsx            # Axios API client
│       ├── utils/
│       │   └── download.js        # File download utility
│       ├── App.jsx                # Router & routes
│       ├── App.css                # Design system & all styles
│       └── main.jsx               # Vite entry point
│
└── README.md
```

## Excel Import Format

### Bachelor Projects
| Group Name   | Project Title                    | Member Names               | Roll Numbers                  |
| ------------ | -------------------------------- | -------------------------- | ----------------------------- |
| Team Alpha   | AI-Powered Smart Farming ...     | Ram Khadka,Sita Poudel,... | 078BCT021,078BCT022,078BCT023 |

### Master Theses
| Project Title                                  | Member Names  | Roll Numbers |
| ---------------------------------------------- | ------------- | ------------ |
| Deep Learning for Nepali Sign Language ...     | Pooja Magar   | 080BCT001    |

## Database Models

- **User** — Users across all roles (MAINTAINER, COORDINATOR, SUPERVISOR, STUDENT, EXTERNAL_EXAMINER)
- **Department** — Academic departments with unique code
- **AcademicYear** — Year/semester per department, with active flag
- **ProjectGroup** — Bachelor project groups with status lifecycle (PENDING → ACTIVE → COMPLETED)
- **GroupMember** — Many-to-many relation between students and groups
- **Thesis** — Master theses linked to a single student
- **EvaluationComponent** — Configurable evaluation rubrics per group/thesis
- **Evaluation** — Marks and comments submitted for components
- **ExaminerAssignment** — External examiner assignments to groups/theses
- **ExternalExaminer** — External examiner contact info
- **Proposal** — Proposal submissions with document uploads and supervisor feedback
- **Notification** — In-app notifications per user
- **Recommendation** — Recommendations issued by evaluators
