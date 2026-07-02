# Thesis / Project Management System — IOE, Pulchowk Campus

A full-stack web application for managing bachelor project groups and master's theses at the **Institute of Engineering, Pulchowk Campus (Tribhuvan University)**. Features role-based access, supervisor assignment, evaluation tracking, and Excel bulk import.

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | React 18 + Vite         |
| Backend  | Node.js + Express       |
| Database | PostgreSQL + Prisma ORM |
| Auth     | JWT (JSON Web Token)    |

## Modules

- **Maintainer** — User management, department & academic year configuration
- **Coordinator** — Dashboard, bachelor project & master thesis oversight, evaluation tracking, supervisor assignment
- **Supervisor** — Dashboard, project/thesis detail view with evaluation & feedback

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
cp .env.example .env    # Configure your DATABASE_URL

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

| Role         | Email                              | Password |
| ------------ | ---------------------------------- | -------- |
| MAINTAINER   | subeshgaming@gmail.com             | subesh   |
| COORDINATOR  | coordinator@pcampus.edu.np         | subesh   |
| SUPERVISOR   | prabeshbchettri25@gmail.com        | subesh   |
| Any Student  | `<roll>@pcampus.edu.np`               | subesh   |

Example student login: `078bct001@pcampus.edu.np` / `subesh`

## API Overview

Base URL: `http://localhost:5000/api`

### Auth
- `POST /auth/login` — Login, returns JWT + user

### Users
- `GET /users` — List all users
- `GET /users/role/:role` — Filter by role (supervisor, student, etc.)

### Groups (Bachelor Projects)
- `GET /groups` — All groups with members, supervisor, evaluations
- `GET /groups/:id` — Single group with full relations
- `POST /groups` — Create group (optional `students` array with firstName/lastName/rollNumber)
- `POST /groups/upload` — Bulk import via Excel (columns: Group Name, Project Title, Member Names, Roll Numbers)
- `PUT /groups/:id/supervisor` — Assign/reassign supervisor
- `PUT /groups/:id/status` — Update group status

### Theses (Master)
- `GET /theses` — All theses
- `POST /theses` — Create thesis
- `POST /theses/upload` — Bulk import via Excel (columns: Project Title, Member Names, Roll Numbers)
- `PUT /theses/:id/supervisor` — Assign/reassign supervisor

### Other
- `GET /stats` — Dashboard statistics (counts by role, status, department)
- `GET /departments` — List departments
- `GET /departments/academic-years` — Academic years
- `GET /evaluations/...` — Evaluations by group/thesis
- `GET /supervisors/groups` — Supervisor's assigned groups
- `GET /supervisors/theses` — Supervisor's assigned theses

## Project Structure

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.js           # Sample data seeder
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── routes/            # Express routes
│   │   ├── middleware/        # Auth middleware
│   │   ├── services/          # Email service
│   │   └── index.js           # Express entry point
│   ├── sample_bachelor_projects.xlsx
│   ├── sample_master_theses.xlsx
│   └── scripts/
│       └── generate-samples.js  # Regenerate sample xlsx files
│
├── frontend/
│   └── src/
│       ├── components/        # Shared components (Sidebar, PageLayout, etc.)
│       ├── contexts/          # ToastContext (notifications)
│       ├── pages/             # Route pages grouped by role
│       ├── services/          # Axios API client
│       ├── App.jsx            # Router & routes
│       └── App.css            # Design system & all styles
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
