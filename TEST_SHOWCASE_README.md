# TPMS Presentation & Demonstration Showcase Guide

This document contains the showcase walkthrough, login credentials, batch configurations, and Excel test templates for the **Thesis & Project Management System (TPMS)**.

---

## 1. Quick Re-seed Command

If you need to reset the entire database to this clean presentation state at any point:

```bash
cd backend
node prisma/seed.js
```

---

## 2. Default Login Credentials

> **Password for ALL accounts:** `subesh`

| Role | Account Email | Name / Program Scope |
| :--- | :--- | :--- |
| **Master Coordinator (Lead)** | `msncs.coordinator@pcampus.edu.np` | Dr. Anil Thapa (MSNCS Coordinator) |
| **Bachelor Coordinator (Lead)** | `bct.coordinator@pcampus.edu.np` | Ram Prasad (BCT Coordinator) |
| **MSDSA Coordinator** | `msdsa.coordinator@pcampus.edu.np` | Dr. Gopal Adhikari (MSDSA Coordinator) |
| **Maintainer / Admin** | `subeshgaming@gmail.com` | Subesh Gaming |
| **Faculty Supervisor** | `prabesh.bhattarai@pcampus.edu.np` | Assoc. Prof. Dr. Prabesh Bhattarai |
| **Faculty Supervisor** | `anita.gurung@pcampus.edu.np` | Asst. Prof. Dr. Anita Gurung |
| **External Examiner (Campus)** | `hari.adhikari@pcampus.edu.np` | Prof. Dr. Hari Adhikari |
| **External Examiner (IOE)** | `prajwal.ghimire@ioe.edu.np` | Dr. Prajwal Ghimire |
| **Master Student (MSNCS 2082)** | `082msncs01@pcampus.edu.np` | Aarav Thakur (MSc Batch 2082) |
| **Master Student (MSDSA 2082)** | `082msdsa01@pcampus.edu.np` | Om Baral (MSc Batch 2082) |
| **Bachelor Minor Student (2080)**| `080bct001@pcampus.edu.np` | Aashish Khadka (BCT Batch 2080) |
| **Bachelor Major Student (2079)**| `079bct001@pcampus.edu.np` | Arun Basnet (BCT Batch 2079) |

---

## 3. Academic Batch & Course Mapping

- **Bachelor Minor Project**: **Batch 2080** (`080BCT...`, `080BEI...`) — 3rd year projects under BCT Coordinator.
- **Bachelor Major Project**: **Batch 2079** (`079BCT...`, `079BEI...`) — Final year projects under BCT Coordinator.
- **Master Program**: **Batch 2082** (`082MSNCS...`, `082MSDSA...`, `082MSICE...`, `082MSCSK...`) — Master Theses (16 Credits) & Projects (4 Credits) under MSNCS Coordinator.

---

## 4. Live Demonstration Walkthrough

### Part A: Master Coordinator & Theses Management (`msncs.coordinator@pcampus.edu.np`)
1. **Login:** Access `/login` with `msncs.coordinator@pcampus.edu.np` (Password: `subesh`).
2. **Interactive Form Responses Matrix:**
   - Go to **Announcements** & click **"View Responses"** on *"M.Sc. Research Thesis Topic Registration & Concept Note (Batch 2082)"* or *"Master Project Registration (4 Credit Course) - Batch 2082"*.
   - **Metrics Bar:** Review summary chips: `Eligible: 28`, `Filled: 15`, `Remaining: 13`.
   - **Fuzzy Supervisor Matching:** Click the blue **"Select"** button on rows like *Aarav Thakur* (`Dr. Prabesh Bhattarai`) or *Chandra Bista* (`Bhattarai`) to show automatic matching to registered faculty.
   - **Invalid/External Advisor Alerts:** Point out rows with *Prof. Andrew Ng* or *Dr. Yann LeCun* where the system informs the coordinator that external advisors require manual supervisor selection.
   - **Inline Edit & Proposal PDF:** Click the PDF icon to view the proposal document; select research clusters inline.
   - **Batch Finalization:** Select multiple checkboxes and click **"Finalize Selected"** to convert concept notes directly into official active Master Theses.
3. **Theses Dashboard & Evaluations:**
   - Go to **Theses** to show active & completed theses with 300-mark evaluation schemes (Supervisor 100 + External Midterm 100 + External Final 100).
   - Open completed thesis *"Automated Intrusion Detection in Software-Defined Networks"* to display full grading rubrics and evaluation sheets.
4. **Excel Import & Export:**
   - Under **Theses**, click **"Bulk Upload"** and upload `backend/excel-templates/New-Test-data/master_msncs_test_data.xlsx` to show preview, fuzzy name resolution, and confirmation.
   - Click **"Export Excel"** on form responses to download formatted spreadsheets.

---

### Part B: Bachelor Coordinator & Group Projects (`bct.coordinator@pcampus.edu.np`)
1. **Login:** Access `/login` with `bct.coordinator@pcampus.edu.np` (Password: `subesh`).
2. **Minor Projects (Batch 2080):**
   - Go to **Bachelor Projects** → Filter by **Minor (2080)**.
   - Review formed student groups (`BCT-080-Group1`, etc.) with assigned supervisors and examiners.
3. **Major Projects (Batch 2079):**
   - Filter by **Major (2079)**.
   - Open completed group `BCT-079-Group1` to show full defense scoring across all milestones: Proposal Defense, Midterm Defense, Supervisor (44/50), External Examiner (18/20), Final Defense (9/10).
4. **Excel Bulk Import:**
   - Click **"Bulk Upload"** and upload `backend/excel-templates/New-Test-data/bachelor_bct_test_data.xlsx` to showcase group parsing, member enrollment, and supervisor assignment.

---

### Part C: Student Portal Flow (`082msncs01@pcampus.edu.np`)
1. **Login:** Access `/login` with `082msncs01@pcampus.edu.np` (Password: `subesh`).
2. **Concept Form Submission & Edit:**
   - Go to **Thesis Forms**.
   - Show status badge **"Submitted (Editable)"**.
   - Click **"Edit Submission"** to show all concept fields (Title, Proposal Type, Research Cluster, Guided flag, Primary/Secondary Supervisors, Remarks, and Attached Proposal PDF with **View PDF** preview link).

---

### Part D: Faculty Supervisor Grading (`prabesh.bhattarai@pcampus.edu.np`)
1. **Login:** Access `/login` with `prabesh.bhattarai@pcampus.edu.np` (Password: `subesh`).
2. **Assigned Groups & Theses:**
   - Go to **Supervised Projects / Theses** to view assigned students.
   - Open an active project, fill in marks (Methodology, Implementation, Defense), enter feedback comments, submit, and download evaluation sheets.

---

## 5. Verified Excel Test Templates Inventory

All templates located in `backend/excel-templates/New-Test-data/` are tested and validated:

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
