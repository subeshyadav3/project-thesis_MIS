# TPMS Presentation & Demonstration Showcase Guide

This document contains the showcase walkthrough, login credentials, timeline-aligned batch configurations, and Excel test templates for the **Thesis & Project Management System (TPMS)**.

---

## 1. Quick Re-seed Command

To reset the entire database to this clean presentation state at any time:

```bash
cd backend
node prisma/seed.js
```

---

## 2. Default Login Credentials

> **Password for ALL accounts:** `subesh`

| Role | Account Email | Name / Program Scope | Context / Demo Focus |
| :--- | :--- | :--- | :--- |
| **Master Coordinator (Lead)** | `msncs.coordinator@pcampus.edu.np` | Dr. Anil Thapa (MSNCS Coordinator) | Master 3rd Sem Projects, Thesis Calls, Interactive Responses Matrix |
| **Bachelor Coordinator (Lead)** | `bct.coordinator@pcampus.edu.np` | Ram Prasad (BCT Coordinator) | 3rd Year Minor (2080), 4th Year Major (2079), Graduated (2078) |
| **MSDSA Coordinator** | `msdsa.coordinator@pcampus.edu.np` | Dr. Gopal Adhikari (MSDSA Coordinator) | Master Data Science & Analytics |
| **Maintainer / Admin** | `maintainer@pcampus.edu.np` | Subesh Gaming | Full system administration & audit |
| **Faculty Supervisor** | `prabesh.bhattarai@pcampus.edu.np` | Assoc. Prof. Dr. Prabesh Bhattarai | Live grading & feedback submission |
| **Faculty Supervisor** | `anita.gurung@pcampus.edu.np` | Asst. Prof. Dr. Anita Gurung | Live grading & feedback submission |
| **External Examiner (Campus)** | `hari.adhikari@pcampus.edu.np` | Prof. Dr. Hari Adhikari | Defense evaluation scoring |
| **External Examiner (IOE)** | `prajwal.ghimire@ioe.edu.np` | Dr. Prajwal Ghimire | External defense evaluation scoring |
| **Master Student (3rd Sem - 2082)** | `subeshgaming@gmail.com` | Roll: `082MSNCS01` (Batch 2082) | Active 4-Cr Project & Concept Proposal edit (Testing Email) |
| **Master Student (4th Sem - 2081)** | `081msncs01@pcampus.edu.np` | Milan Parajuli (MSNCS Batch 2081) | Active 16-Cr Master Thesis defense |
| **Master Graduated Archive (2080)** | `080msncs01@pcampus.edu.np` | Prakash Bastola (MSNCS Batch 2080) | Completed Master Thesis (300 marks) |
| **Bachelor 3rd Year Minor (2080)** | `080bct001@pcampus.edu.np` | Aashish Khadka (BCT Batch 2080) | Active Minor Project Group |
| **Bachelor 4th Year Major (2079)** | `079bct001@pcampus.edu.np` | Arun Basnet (BCT Batch 2079) | Active Major Project Defense |
| **Bachelor Graduated Archive (2078)** | `078bct001@pcampus.edu.np` | Bikash Shrestha (BCT Batch 2078) | Completed Major Project Archive |

---

## 3. Academic Timeline & Batch Architecture

The database reflects the IOE Tribhuvan University semester progression:

### Bachelor Degree (4 Years / 8 Semesters):
- **1st Year (Batch 083 / 2083 BS)**: 1st/2nd Semester coursework — **0 projects**.
- **2nd Year (Batch 082 / 2082 BS)**: 3rd/4th Semester coursework — **0 projects**.
- **3rd Year (Batch 080 / 2080 BS)**: 5th/6th Semester — **Minor Projects (Active & In-progress)**.
- **4th Year (Batch 079 / 2079 BS)**: 7th/8th Semester — **Major Projects (Active & Defending)**.
- **Graduated (Batch 078 / 2078 BS & earlier)**: 4+ years passed — **Completed Major Projects (Fully evaluated across all 5 grading stages)**.

### Master Degree (2 Years / 4 Semesters):
- **1st Year (Batch 083 / 2083 BS)**: 1st/2nd Semester coursework — **0 projects/theses**.
- **3rd Semester (Batch 082 / 2082 BS)**: **Master Project (4-Credit Course, Active)** & **Thesis Concept Registration Call**.
- **4th Semester (Batch 081 / 2081 BS)**: **Master Thesis (16-Credit Course, Active & Finalizing)**.
- **Graduated (Batch 080, 079, 078)**: **Completed Theses & Projects (Fully evaluated: 300 Marks Thesis Scheme / 100 Marks Project Scheme)**.

---

## 4. Live Demonstration Walkthrough

### Part A: Master Coordinator & Interactive Spreadsheet (`msncs.coordinator@pcampus.edu.np`)
1. **Login:** `/login` with `msncs.coordinator@pcampus.edu.np` (Password: `subesh`).
2. **Interactive Form Responses Matrix:**
   - Navigate to **Announcements** & click **"View Responses"** on *"M.Sc. Research Thesis Topic Registration & Concept Note (Batch 2082)"* or *"Master Project Registration (4 Credit Course) - Batch 2082"*.
   - **Metrics Bar:** Review summary chips: `Eligible: 28`, `Filled: 15`, `Remaining: 13`.
   - **Fuzzy Supervisor Auto-Matching:** Click the blue **"Select"** button on rows like *Aarav Thakur* (`Dr. Prabesh Bhattarai`), *Chandra Bista* (`Bhattarai`), or *Om Baral* (`gurung`) to show instant auto-matching to registered faculty.
   - **Invalid/External Advisor Alerts:** Show rows with *Prof. Andrew Ng* or *Dr. Yann LeCun* where the system warns that external advisors require manual supervisor selection.
   - **Inline Edit & Proposal PDF:** Click the PDF icon to view the generated proposal PDF in a new tab; select research clusters inline.
   - **Batch Finalization:** Select multiple checkboxes and click **"Finalize Selected"** to convert concept notes directly into official active Master Theses.
3. **Theses Dashboard & Evaluations:**
   - Navigate to **Theses** to show active 4th sem theses (2081), active 3rd sem projects (2082), and completed graduated archives (2080, 2079, 2078).
   - Open a completed thesis to display full 300-mark rubrics (Supervisor 100 + External Midterm 100 + External Final 100).
4. **Excel Import & Export:**
   - In **Theses**, click **"Bulk Upload"** and upload `backend/excel-templates/New-Test-data/master_msncs_test_data.xlsx` to show preview, fuzzy name resolution, and confirmation.
   - In Announcements, click **"Export Excel"** on form responses to download formatted spreadsheets.

---

### Part B: Bachelor Coordinator & Group Projects (`bct.coordinator@pcampus.edu.np`)
1. **Login:** `/login` with `bct.coordinator@pcampus.edu.np` (Password: `subesh`).
2. **Minor Projects (3rd Year - Batch 2080):**
   - Navigate to **Bachelor Projects** → Filter by **Minor (2080)**.
   - Review active student groups (`BCT-080-Group1`, etc.) with assigned supervisors and examiners.
3. **Major Projects (4th Year - Batch 2079) & Graduated (Batch 2078):**
   - Filter by **Major (2079)** for active defending groups.
   - Filter by **Major (2078)** and open `BCT-078-Group1` to show full defense scoring across all 5 milestones: Proposal Defense (8.5/10), Midterm Defense (8.0/10), Supervisor (45/50), External Examiner (18.5/20), Final Defense (9/10).
4. **Excel Bulk Import:**
   - Click **"Bulk Upload"** and upload `backend/excel-templates/New-Test-data/bachelor_bct_test_data.xlsx` to demonstrate automated group parsing and enrollment.

---

### Part C: Student Portal Flow (`082msncs01@pcampus.edu.np`)
1. **Login:** `/login` with `082msncs01@pcampus.edu.np` (Password: `subesh`).
2. **Concept Form Submission & Edit:**
   - Navigate to **Thesis Forms**.
   - Show status badge **"Submitted (Editable)"**.
   - Click **"Edit Submission"** to demonstrate that all concept fields (Title, Proposal Type, Research Cluster, Guided flag, Primary/Secondary Supervisors, Remarks, and Attached Proposal PDF with **View PDF** preview link) are pre-populated, fully editable, and unified.

---

### Part D: Faculty Supervisor Grading (`prabesh.bhattarai@pcampus.edu.np`)
1. **Login:** `/login` with `prabesh.bhattarai@pcampus.edu.np` (Password: `subesh`).
2. **Assigned Groups & Theses:**
   - Navigate to **Supervised Projects / Theses** to view assigned students.
   - Open an active project, input criterion marks (Methodology, Implementation, Defense), enter feedback comments, submit, and download evaluation sheets.

---

## 5. Live Defense Showcase Excel Datasets (`backend/excel-templates/defense-showcase/`)

These 5 spreadsheets strictly follow the official templates (including `degreeType` for users) and use **100% verified clean & unassigned students** (no active thesis, no project, no form submission) for seamless live demonstration:

| File Name | Target Upload Destination | Batch / Semester | Description & Roles |
| :--- | :--- | :--- | :--- |
| `01_master_3rd_sem_082_projects.xlsx` | **Theses &rarr; Bulk Upload** | **Batch 2082 (3rd Sem Project - 4 Cr)** | 4 Master Projects (`082MSNCS05-06`, `082MSDSA05-06`). Type `Project`. External Final Examiner assigned. |
| `02_master_4th_sem_081_theses.xlsx` | **Theses &rarr; Bulk Upload** | **Batch 2081 (4th Sem Thesis - 16 Cr)** | 4 Master Theses (`081MSNCS02-03`, `081MSDSA02-03`). Type `Thesis`. Supervisor, External Midterm & Final assigned. |
| `03_master_student_users.xlsx` | **Users &rarr; Bulk Upload** | **New Enrollment (Batch 083)** | 4 New Master students. Columns: `email`, `password`, `firstName`, `lastName`, `rollNumber`, `programCode`, `degreeType` (`MASTER`). |
| `04_master_supervisor_users.xlsx` | **Users &rarr; Bulk Upload** | **Department Faculty** | 3 Faculty Supervisors (Prof. Dr. Subarna Shakya, Prof. Dr. Nanda Bikram Adhikari, Assoc. Prof. Dr. Babu Ram Dawadi). |
| `05_master_external_examiners.xlsx` | **Users &rarr; Bulk Upload** | **External Defense Jury** | 2 External Examiners (Prof. Dr. Shashidhar Ram Joshi, Assoc. Prof. Dr. Sanjeeb Prasad Panday). |

---

## 6. Legacy / Reference Excel Templates Inventory

Reference templates in `backend/excel-templates/New-Test-data/`:

| File Name | Target Upload Destination | Role / Type |
| :--- | :--- | :--- |
| `bachelor_bct_test_data.xlsx` | Bachelor Projects → Bulk Upload | Bachelor Groups (BCT) |
| `bachelor_student_users_test_data.xlsx` | Users → Bulk Upload | Bachelor Students |
| `bachelor_supervisor_users_test_data.xlsx` | Users → Bulk Upload | Faculty Supervisors |
| `bachelor_external_users_test_data.xlsx` | Users → Bulk Upload | External Examiners |
| `master_theses_test_data.xlsx` | Theses → Bulk Upload | Master Theses |
| `master_projects_test_data.xlsx` | Theses → Bulk Upload | Master Projects |
| `master_msncs_test_data.xlsx` | Theses → Bulk Upload | MSNCS Theses |
| `master_msdsa_test_data.xlsx` | Theses → Bulk Upload | MSDSA Theses |
| `master_all_programs_theses_test_data.xlsx` | Theses → Bulk Upload | Multi-Program Theses |
| `master_student_users_test_data.xlsx` | Users → Bulk Upload | Master Students |
| `master_supervisor_users_test_data.xlsx` | Users → Bulk Upload | Faculty Supervisors |
| `master_external_users_test_data.xlsx` | Users → Bulk Upload | External Examiners |
