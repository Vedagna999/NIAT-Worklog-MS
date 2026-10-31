# NIAT Worklog Management System

> Enterprise-grade full-stack web application designed to replace spreadsheet-based daily worklog tracking for 50+ mentors and managers with real-time target tracking, RBAC security, anti-overlap validation, and automated analytics.

---

## 🚀 Key Highlights & Architectural Features

- **Frontend:** React 19 (Vite) + Tailwind CSS + Lucide Icons + `date-fns`
- **Backend:** Python FastAPI with RESTful endpoints, Pydantic v2 schemas, and dependency injection
- **Database Architecture:** Relational PostgreSQL Schema (with UUID primary keys, check constraints, index patterns, and anti-overlap intervals) + zero-config SQLite driver support
- **Authentication & RBAC:** JWT Bearer authentication with strict Role-Based Access Control (`MENTOR`, `MANAGER`, `ADMIN`)
- **Interactive UI/UX:**
  - **Screen A (Mentor Daily Worklog Submission):**
    - Quick end-of-day record entry (< 5 minutes)
    - Live progress bar tracking the daily 6-hour (360 minutes) threshold with dynamic color feedback (Green for $\ge$ 6h, Amber for under 6h)
    - Dynamic category-linked task templates that auto-fill task name, description, and outcomes in 1-click
    - 15-minute quick time snap intervals with auto-calculated duration
    - Collapsible fields for remarks, dependencies, and deviations
    - Worklog status transitions (`DRAFT`, `SUBMITTED`, `LOCKED`)
  - **Screen B (Manager Portal):**
    - Clean dark-and-white portal dashboard
    - Top bar displaying `Viewing Work Log of [Mentor Name]` with `[SHARED PORTAL — READ ONLY]` and `[REMARKS ENABLED]` status tags
    - Horizontal scrollable **Browse By Date Strip** with high-contrast active state, `<` / `>` carousel arrows, and "Today" shortcut
    - 4 KPI summary cards: Total Time, Completed count, In Progress count, and Specific Learning Time (sums `activity_group = 'LEARNING'`)
    - Activity breakdown table with color-coded category badges
    - Clean empty state banner (*"No work logged for this day"*)
    - Manager remarks panel to leave structured feedback
  - **Screen C (Weekly & Monthly Reports):**
    - Time utilization aggregates across Learning, Mentoring, Invigilation, and Administrative tasks
    - Mentor comparison table with 6-hour target compliance rates
  - **Screen D (Admin Console):**
    - User account management and role assignments
    - Direct mentor-manager mapping configuration
    - Activity category management (qualifying for 6-hour target)
    - Emergency unlock/reopen tool for locked worklogs after deadlines

---

## 🔐 Pre-Seeded Demo Credentials

The database comes pre-seeded with 1 Admin, 2 Managers, and 5 Mentors with a full 7-day realistic worklog history (including both $\ge$6h days and sub-6h days):

| Role | Name | Email | Password | Assigned To / Mentors |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Rajesh Sharma | `admin@niat.edu` | `admin123` | Full system access |
| **MANAGER** | Vikram Sharma | `manager1@niat.edu` | `manager123` | Aarav, Ananya, Rohan |
| **MANAGER** | Priya Raman | `manager2@niat.edu` | `manager123` | Sneha, Aditya |
| **MENTOR** | Aarav Patel | `mentor1@niat.edu` | `mentor123` | Mgr: Vikram Sharma |
| **MENTOR** | Ananya Iyer | `mentor2@niat.edu` | `mentor123` | Mgr: Vikram Sharma |
| **MENTOR** | Rohan Deshmukh | `mentor3@niat.edu` | `mentor123` | Mgr: Vikram Sharma |
| **MENTOR** | Sneha Kulkarni | `mentor4@niat.edu` | `mentor123` | Mgr: Priya Raman |
| **MENTOR** | Aditya Verma | `mentor5@niat.edu` | `mentor123` | Mgr: Priya Raman |

> **Tip:** You can also use the **"Role Switcher"** pill in the top navbar or the quick login buttons on the login screen to switch roles instantly with 1-click!

---

## 🗄️ Relational Database Schema (PostgreSQL DDL)

The complete SQL DDL is located in [`backend/schema.sql`](file:///e:/NxtWave/Mentor_Performance _management_system/backend/schema.sql).

### Table Schema Overview:
1. `users`
   - `id`: UUID (PK, `uuid_generate_v4()`)
   - `full_name`: VARCHAR(255)
   - `email`: VARCHAR(255) UNIQUE (Indexed)
   - `password_hash`: VARCHAR(255)
   - `role`: ENUM (`MENTOR`, `MANAGER`, `ADMIN`)
   - `manager_id`: UUID REFERENCES `users(id)` ON DELETE SET NULL
   - `status`: ENUM (`ACTIVE`, `INACTIVE`)
2. `activity_categories`
   - `id`: UUID (PK)
   - `name`: VARCHAR(100) UNIQUE (`NIAT-Learnings`, `Mentoring`, `Invigilation`, `Meetings`, etc.)
   - `activity_group`: ENUM (`LEARNING`, `MENTORING`, `INVIGILATION`, `ADMINISTRATIVE`)
   - `qualifies_for_six_hours`: BOOLEAN (default TRUE)
3. `daily_worklogs`
   - `id`: UUID (PK)
   - `mentor_id`: UUID REFERENCES `users(id)` ON DELETE CASCADE
   - `work_date`: DATE
   - `status`: ENUM (`DRAFT`, `SUBMITTED`, `LOCKED`)
   - `total_actual_minutes`: INT (default 0)
   - `is_target_achieved`: BOOLEAN (default FALSE, True when total_actual_minutes $\ge$ 360)
   - `submission_time`: TIMESTAMPTZ
   - `CONSTRAINT uq_mentor_workdate UNIQUE (mentor_id, work_date)`
4. `worklog_activities`
   - `id`: UUID (PK)
   - `worklog_id`: UUID REFERENCES `daily_worklogs(id)` ON DELETE CASCADE
   - `mentor_id`: UUID REFERENCES `users(id)` ON DELETE CASCADE
   - `category_id`: UUID REFERENCES `activity_categories(id)` ON DELETE RESTRICT
   - `task_name`: VARCHAR(255)
   - `task_description`: TEXT
   - `outcome`: TEXT
   - `priority`: ENUM (`LOW`, `MEDIUM`, `HIGH`)
   - `status`: ENUM (`IN_PROGRESS`, `COMPLETED`, `BLOCKED`)
   - `start_time`: TIMESTAMPTZ
   - `end_time`: TIMESTAMPTZ
   - `actual_minutes`: INT
   - `remarks`, `dependencies`, `deviations`: TEXT
   - `CONSTRAINT chk_end_after_start CHECK (end_time > start_time)`
   - **Anti-overlap validation:** Enforces interval non-overlap `(mentor_id, [start_time, end_time))` preventing duplicate concurrent entries.
5. `manager_feedback`
   - `id`: UUID (PK)
   - `worklog_id`: UUID REFERENCES `daily_worklogs(id)` ON DELETE CASCADE
   - `manager_id`: UUID REFERENCES `users(id)` ON DELETE CASCADE
   - `remarks`: TEXT
   - `created_at`: TIMESTAMPTZ

---

## 🛠️ Getting Started & Installation

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python seed.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Web Application URL: `http://127.0.0.1:5173`

### 3. Automated Backend Tests
Run the comprehensive test suite verifying RBAC permissions, anti-overlap interval validation, threshold calculations, and admin workflows:
```bash
cd backend
python -m unittest test_backend.py
```
All 8 test suites execute and pass cleanly.
