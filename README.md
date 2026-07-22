<div align="center">

<img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status"/>
<img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react" alt="React"/>
<img src="https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=nodedotjs" alt="Node.js"/>
<img src="https://img.shields.io/badge/PostgreSQL-16.x-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL"/>
<img src="https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat-square&logo=prisma" alt="Prisma"/>

<br/>

# 🎓 Thesis & Project Management System (TPMS)

### Pulchowk Campus — Institute of Engineering, Tribhuvan University

**A comprehensive academic workflow platform for managing bachelor and master thesis/project lifecycles — from group formation and supervisor assignment to final evaluation and PDF generation.**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [User Roles](#-user-roles)
- [Key Workflows](#-key-workflows)
- [API Overview](#-api-overview)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 Overview

TPMS is a full-stack academic management system designed specifically for **Pulchowk Campus, IOE**. It streamlines the entire thesis and project management workflow:

- **Bachelor Students**: Form project groups, submit proposals, upload documents, track evaluation progress
- **Master Students**: Register theses, submit documents across proposal/mid-term/final stages
- **Supervisors**: Evaluate students, provide feedback, issue recommendations
- **External Examiners**: Evaluate mid-term and final thesis/project work
- **Program Coordinators**: Manage users, assign supervisors/examiners, bulk-import students, forward results
- **Maintainers**: System-wide administration

The system supports **6 academic programs** across **Bachelor** (BCT, BEI) and **Master** (MSNCS, MSICE, MSDSA, MSCSKE) levels with built-in academic year and batch management.

---

## ✨ Features

### 🔐 Role-Based Access
- Five distinct roles with granular permissions
- Program-scoped coordinator access (bachelor = own program, master = cross-program)
- JWT-based authentication with secure password hashing

### 👥 Student Management
- Bulk import students from Excel templates with auto-validation
- Group formation with invitation system
- Thesis registration for master students
- Document upload with version tracking

### 👨‍🏫 Supervisor & Examiner Management
- Auto-assignment from bulk import
- Cross-program supervisor assignment requests
- Separate mid-term and final external examiner assignment
- Designation-aware display (e.g., "Asst. Prof.", "Assoc. Prof. Dr.")

### 📊 Evaluation System
- Configurable evaluation schemes per project type (Minor/Major/Master)
- Supervisor evaluation with 5 criteria × 20 marks
- External (Mid-Term) evaluation with 5 criteria × 20 marks
- External (Final) evaluation with 5 criteria × 20 marks
- Coordinator-grade evaluation oversight
- Live PDF preview with real-time mark/comment updates

### 📄 PDF Generation
- Automated A4-formatted evaluation sheets
- University-branded templates (TU, IOE, Pulchowk Campus)
- Supervisor designation and external examiner details
- Word-to-number conversion for total marks
- Scope-specific printing (supervisor/external/all)

### 📬 Notifications & Communication
- In-app notification system
- Email notifications for assignments, feedback, and updates
- Recommendation letter issuance
- Feedback submission alerts

### 📈 Academic Year Management
- Batch-aware semester computation (078/079/080/081/082)
- Automatic MINOR/MAJOR project type detection from batch year
- Academic year-based grouping and filtering

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Vite 5** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client |
| **CSS Variables** | Theming (IOE academic blue theme) |
| **Material Symbols** | Icon library |
| **Inter + DM Sans** | Typography |

### Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | REST API server |
| **Prisma 5** | ORM & database migrations |
| **PostgreSQL** | Primary database |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Puppeteer** | Server-side PDF generation |
| **Multer** | File upload handling |
| **Nodemailer** | Email notifications |
| **xlsx** | Excel template parsing |

---

## 🏗 System Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐
│   React      │     │           Express API                │
│   Frontend   │────▶│                                      │
│   (Vite)     │     │  /api/auth      → Auth Controller    │
│              │     │  /api/groups    → Group Controller   │
│   Port 5173  │     │  /api/theses    → Thesis Controller  │
│              │     │  /api/evaluations→ Eval Controller   │
│              │     │  /api/print     → Print Controller   │
└─────────────┘     │  /api/users     → User Controller    │
                    │  /api/students  → Student Controller │
                    │  /api/upload    → Upload Controller  │
                    │  ...                                  │
                    │         Port 5000                     │
                    └──────────┬───────────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │     PostgreSQL        │
                    │     Database          │
                    │  (via Prisma ORM)     │
                    └──────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14.x
- **npm** or **yarn**
- **Google Chrome / Chromium** (for PDF generation via Puppeteer)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd se

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Environment Variables

Create `.env` files in both `backend/` and `frontend/`:

**backend/.env**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/thesis_management?schema=public"
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000

# Email (optional — for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Puppeteer (optional — defaults to auto-detect)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
```

### Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database with sample data
npm run prisma:seed
```

The seed script creates:
- 1 department (ECE — Electronics and Computer Engineering)
- 6 programs (2 bachelor + 4 master)
- 5 academic years (078–082)
- 1 maintainer, 6 coordinators, 8 supervisors, 4 external examiners
- ~340 students across all batches and programs
- Sample bachelor groups and master theses with evaluations

### Running the Application

```bash
# Terminal 1: Start the backend
cd backend
npm run dev        # Development with hot-reload
# OR
npm start          # Production

# Terminal 2: Start the frontend
cd frontend
npm run dev        # Development server on port 5173
# OR
npm run build      # Production build
```

Access the application at **http://localhost:5173**

---

## 👥 User Roles

| Role | Permissions | Typical Actions |
|------|-------------|-----------------|
| **MAINTAINER** | Full system access | User management, configuration |
| **COORDINATOR** | Program-level management | Group/thesis oversight, bulk import, evaluation review, result forwarding |
| **SUPERVISOR** | Evaluate assigned projects | Mark entry, feedback, recommendations |
| **EXTERNAL_EXAMINER** | Evaluate assigned projects/theses | Mid-term/final evaluation, mark entry |
| **STUDENT** | Project/thesis submission | Group formation, document upload, view evaluations |

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Maintainer | subeshgaming@gmail.com | subesh |
| Bachelor Student | bachelor@test.com | subesh |
| Master Student | master@test.com | subesh |
| BCT Coordinator | bct.coordinator@pcampus.edu.np | subesh |
| MSNCS Coordinator | msncs.coordinator@pcampus.edu.np | subesh |
| Supervisor | bishnu.tamang@pcampus.edu.np | subesh |
| External Examiner | kiran.mainali@ioe.edu.np | subesh |

---

## 🔄 Key Workflows

### Bachelor Project Flow
```
Student creates group ─▶ Coordinator approves ─▶ Supervisor assigned
    ─▶ Proposal submission ─▶ Mid-term evaluation ─▶ Final evaluation
    ─▶ Results forwarded to exam department
```

### Master Thesis Flow
```
Coordinator creates announcement ─▶ Student submits thesis
    ─▶ Coordinator approves ─▶ Supervisor assigned
    ─▶ External examiners assigned (mid-term + final)
    ─▶ Proposal → Mid-term → Final evaluations
    ─▶ Thesis completion
```

### Bulk Import Flow
```
Upload Excel file ─▶ Preview with anomaly detection
    ─▶ Auto-create missing users (supervisors, examiners)
    ─▶ Confirm import ─▶ Groups/theses created with assignments
```

---

## 📡 API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/users` | GET/POST/DELETE | User management |
| `/api/groups` | GET/POST | Project group operations |
| `/api/theses` | GET/POST | Thesis management |
| `/api/evaluations/marks` | POST | Submit/update evaluation marks |
| `/api/evaluations/thesis/:id` | GET | Get thesis evaluations |
| `/api/print/thesis/:id` | GET | Generate evaluation PDF |
| `/api/print/preview/thesis/:id` | GET | HTML preview of evaluation |
| `/api/upload/proposal` | POST | Document upload |
| `/api/groups/bulk-import/preview` | POST | Preview bulk import |
| `/api/groups/bulk-import/confirm` | POST | Confirm bulk import |
| `/api/forward` | POST | Forward results to exam dept |

Full API documentation available in the source code route handlers.

---

## 📁 Project Structure

```
se/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── seed.js             # Database seeder
│   │   └── migrations/         # Prisma migrations
│   ├── src/
│   │   ├── index.js            # Express app entry
│   │   ├── controllers/        # Route handlers
│   │   ├── routes/             # Express routes
│   │   ├── services/           # Business logic (email, PDF, notifications)
│   │   ├── middleware/         # Auth, error handling
│   │   ├── config/             # Evaluation schemes, year/semester rules
│   │   ├── utils/              # Prisma client, helpers
│   │   └── ...
│   ├── excel-templates/        # Sample Excel files for bulk import
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page components by role
│   │   │   ├── coordinator/    # Coordinator dashboard & management
│   │   │   ├── supervisor/     # Supervisor evaluation pages
│   │   │   ├── external/       # External examiner pages
│   │   │   └── student/        # Student submission pages
│   │   ├── services/           # API client configuration
│   │   ├── contexts/           # React contexts (toast, etc.)
│   │   └── styles/             # CSS variables & global styles
│   ├── public/                 # Static assets
│   └── package.json
│
├── ai_chatbot/                 # AI chatbot for proposal review
├── README.md
└── .gitignore
```

---

## 📸 Screenshots

> Screenshots are available in the project documentation.
> 
> *Dashboard* — Role-based overview with statistics cards
> *Evaluation Review* — Side-by-side marks editor with live PDF preview
> *Bulk Import* — Excel template upload with anomaly detection preview
> *PDF Generation* — University-branded A4 evaluation sheets

---

## 🤝 Contributing

This project is developed for Pulchowk Campus, Institute of Engineering. For internal contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed for academic purposes at **Pulchowk Campus, Institute of Engineering, Tribhuvan University**.

---

<div align="center">
  <sub>Built with ❤️ for the academic community of Pulchowk Campus, IOE</sub>
  <br/>
  <sub>Thesis & Project Management System © 2026</sub>
</div>
