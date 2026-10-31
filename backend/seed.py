import uuid
from datetime import date, datetime, timedelta, timezone, time
import os
import sys

# Set standard utf-8 encoding for stdout if possible
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.models import (
    User,
    UserRole,
    UserStatus,
    ActivityCategory,
    ActivityGroup,
    DailyWorklog,
    WorklogActivity,
    ManagerFeedback,
    WorklogStatus,
    TaskPriority,
    TaskStatus
)
from app.auth import hash_password

def seed_database():
    print("[+] Re-creating database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Clear existing data in reverse dependency order
    print("[+] Cleaning existing seed data...")
    db.query(ManagerFeedback).delete()
    db.query(WorklogActivity).delete()
    db.query(DailyWorklog).delete()
    db.query(ActivityCategory).delete()
    db.query(User).delete()
    db.commit()

    # 1. Seed Categories
    print("[+] Seeding Activity Categories...")
    categories_data = [
        {"name": "NIAT-Learnings", "activity_group": ActivityGroup.LEARNING, "qualifies": True},
        {"name": "Mentoring", "activity_group": ActivityGroup.MENTORING, "qualifies": True},
        {"name": "Invigilation", "activity_group": ActivityGroup.INVIGILATION, "qualifies": True},
        {"name": "Evaluation & Grading", "activity_group": ActivityGroup.MENTORING, "qualifies": True},
        {"name": "Content Prep", "activity_group": ActivityGroup.ADMINISTRATIVE, "qualifies": True},
        {"name": "Internal Meetings", "activity_group": ActivityGroup.ADMINISTRATIVE, "qualifies": True},
        {"name": "Administrative", "activity_group": ActivityGroup.ADMINISTRATIVE, "qualifies": True},
    ]

    cat_map = {}
    for c in categories_data:
        cat = ActivityCategory(
            name=c["name"],
            activity_group=c["activity_group"],
            qualifies_for_six_hours=c["qualifies"]
        )
        db.add(cat)
        db.flush()
        cat_map[c["name"]] = cat

    # 2. Seed Users
    print("[+] Seeding Users (1 Admin, 2 Managers, 5 Mentors)...")

    # Admin
    admin = User(
        full_name="Rajesh Sharma (Admin)",
        email="admin@niat.edu",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    db.add(admin)
    db.flush()

    # Managers
    mgr1 = User(
        full_name="Vikram Sharma",
        email="manager1@niat.edu",
        password_hash=hash_password("manager123"),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE
    )
    mgr2 = User(
        full_name="Priya Raman",
        email="manager2@niat.edu",
        password_hash=hash_password("manager123"),
        role=UserRole.MANAGER,
        status=UserStatus.ACTIVE
    )
    db.add_all([mgr1, mgr2])
    db.flush()

    # Mentors
    mentors_data = [
        {"name": "Aarav Patel", "email": "mentor1@niat.edu", "mgr": mgr1.id},
        {"name": "Ananya Iyer", "email": "mentor2@niat.edu", "mgr": mgr1.id},
        {"name": "Rohan Deshmukh", "email": "mentor3@niat.edu", "mgr": mgr1.id},
        {"name": "Sneha Kulkarni", "email": "mentor4@niat.edu", "mgr": mgr2.id},
        {"name": "Aditya Verma", "email": "mentor5@niat.edu", "mgr": mgr2.id},
    ]

    mentors = []
    for m in mentors_data:
        mentor = User(
            full_name=m["name"],
            email=m["email"],
            password_hash=hash_password("mentor123"),
            role=UserRole.MENTOR,
            manager_id=m["mgr"],
            status=UserStatus.ACTIVE
        )
        db.add(mentor)
        db.flush()
        mentors.append(mentor)

    # 3. Seed Sample 7-day worklogs for Mentor 1 (Aarav Patel) and Mentor 2 (Ananya Iyer)
    print("[+] Seeding 7-day realistic worklogs with >6h and sub-6h days...")
    today = date.today()

    # Schedule definition for Mentor 1 (Aarav Patel)
    m1_days = [
        # Day -6: Full 6h 30m (390 mins) -> Target Achieved!
        {
            "offset": -6,
            "status": WorklogStatus.SUBMITTED,
            "slots": [
                ("Internal Meetings", "Daily Morning Standup", "Aligned on student escalations", time(9, 30), time(10, 30), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
                ("NIAT-Learnings", "Full-Stack Architecture & Microservices Study", "Reviewed clean architecture patterns in FastAPI", time(10, 30), time(12, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "1-on-1 Student Doubt Clearing Session", "Solved React re-render and async race conditions for 5 learners", time(13, 30), time(16, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Internal Meetings", "Curriculum Sync Meeting", "Reviewed sprint 4 assessment questions", time(16, 45), time(17, 15), TaskPriority.LOW, TaskStatus.COMPLETED),
            ]
        },
        # Day -5: Full 7h 00m (420 mins) -> Target Achieved!
        {
            "offset": -5,
            "status": WorklogStatus.SUBMITTED,
            "slots": [
                ("Internal Meetings", "Daily Morning Standup", "Day kickoff and cohort blocker triage", time(9, 30), time(10, 30), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
                ("Invigilation", "Weekly Coding Assessment Proctoring", "Supervised 60 students on algorithmic contest; zero flags", time(10, 30), time(12, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "Cohort Group Discussion & Live Coding Demo", "Demonstrated relational schema normalization and indexing", time(13, 30), time(16, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "Project Code Review & Refactoring Walkthrough", "Merged 8 student PRs and gave architectural feedback", time(16, 45), time(17, 45), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
            ]
        },
        # Day -4: Sub-6h Day (4h 30m / 270 mins) -> Under Target
        {
            "offset": -4,
            "status": WorklogStatus.SUBMITTED,
            "slots": [
                ("Internal Meetings", "Daily Morning Standup", "Reviewed weekly sprint goals", time(9, 30), time(10, 30), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
                ("Mentoring", "Technical Mock Interview & Feedback", "Conducted mock system design interviews with 2 senior learners", time(10, 45), time(12, 45), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "1-on-1 Doubt Resolution", "Blocker in Redux Toolkit store integration", time(14, 0), time(15, 30), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
            ]
        },
        # Day -3: Full 6h 15m (375 mins) -> Target Achieved!
        {
            "offset": -3,
            "status": WorklogStatus.SUBMITTED,
            "slots": [
                ("Internal Meetings", "Daily Morning Standup", "Status check and attendance review", time(9, 30), time(10, 15), TaskPriority.LOW, TaskStatus.COMPLETED),
                ("NIAT-Learnings", "DSA Mastery & Advanced Problem Solving", "Solved 3 dynamic programming hard problems", time(10, 30), time(13, 0), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "Capstone Project Mentorship", "Guided teams on PostgreSQL schema design and foreign keys", time(14, 0), time(17, 0), TaskPriority.HIGH, TaskStatus.COMPLETED),
            ]
        },
        # Day -2: Sub-6h Day (5h 00m / 300 mins) -> Under Target
        {
            "offset": -2,
            "status": WorklogStatus.SUBMITTED,
            "slots": [
                ("Invigilation", "Weekly Assessment Proctoring", "Proctored live test session", time(9, 30), time(12, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "1-on-1 Student Doubt Clearing Session", "Resolved auth token expiry bugs with 4 students", time(14, 0), time(16, 0), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
            ]
        },
        # Day -1: Full 6h 45m (405 mins) -> Target Achieved!
        {
            "offset": -1,
            "status": WorklogStatus.SUBMITTED,
            "slots": [
                ("Internal Meetings", "Daily Morning Standup", "Daily briefing", time(9, 30), time(10, 15), TaskPriority.LOW, TaskStatus.COMPLETED),
                ("NIAT-Learnings", "AI Tools & Developer Productivity Workshop", "Hands-on with automated test generators and LLM tools", time(10, 30), time(12, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "Project Code Review & Refactoring Walkthrough", "Assisted 6 teams with API endpoint optimizations", time(13, 30), time(17, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
            ]
        },
        # Day 0 (Today): Full 6h 30m (390 mins) -> Target Achieved!
        {
            "offset": 0,
            "status": WorklogStatus.SUBMITTED,
            "has_feedback": True,
            "slots": [
                ("Internal Meetings", "Daily Morning Standup", "Team alignment and mentor queue assignment", time(9, 30), time(10, 30), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
                ("NIAT-Learnings", "Database Query Optimization & Indexing", "Deep dive into Postgres EXPLAIN ANALYZE and B-Tree indexes", time(10, 30), time(12, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "1-on-1 Student Doubt Clearing Session", "Resolved tricky async database deadlock issues with cohort 12", time(13, 30), time(16, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
                ("Mentoring", "Technical Mock Interview & Feedback", "Conducted full-stack coding interview with 2 candidates", time(16, 45), time(17, 45), TaskPriority.HIGH, TaskStatus.COMPLETED),
            ]
        }
    ]

    # Mentor 2 (Ananya Iyer) 7-day variation
    m2_days = [
        {"offset": -6, "status": WorklogStatus.SUBMITTED, "slots": [
            ("Mentoring", "1-on-1 Doubt Resolution", "Debugging CSS layout bugs", time(9, 30), time(13, 30), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
            ("NIAT-Learnings", "TypeScript Strict Mode Deep Dive", "Generic constraints and mapped types", time(14, 30), time(16, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
        ]},
        {"offset": -5, "status": WorklogStatus.SUBMITTED, "slots": [
            ("Internal Meetings", "Team Retrospective", "Sprint review meeting", time(10, 0), time(11, 30), TaskPriority.LOW, TaskStatus.COMPLETED),
            ("Mentoring", "Student Doubt Clearing", "React context and reducer pattern", time(14, 0), time(16, 0), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
        ]},
        {"offset": -4, "status": WorklogStatus.SUBMITTED, "slots": [
            ("Invigilation", "Milestone Exam Proctoring", "Proctored cohort 9 exam", time(9, 30), time(12, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
            ("Mentoring", "Project Mentorship", "Guided capstone project submissions", time(13, 30), time(17, 0), TaskPriority.HIGH, TaskStatus.COMPLETED),
        ]},
        {"offset": -3, "status": WorklogStatus.SUBMITTED, "slots": [
            ("NIAT-Learnings", "Advanced SQL & Database Design", "Window functions and recursive CTEs", time(9, 30), time(12, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
            ("Mentoring", "1-on-1 Doubt Resolution", "Assisted 5 students on frontend routing", time(13, 30), time(16, 30), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
        ]},
        {"offset": -2, "status": WorklogStatus.SUBMITTED, "slots": [
            ("Internal Meetings", "Mentor Coordination", "Weekly sync", time(10, 0), time(11, 0), TaskPriority.LOW, TaskStatus.COMPLETED),
            ("Mentoring", "Code Reviews", "Reviewed 6 repositories", time(13, 0), time(16, 0), TaskPriority.MEDIUM, TaskStatus.COMPLETED),
        ]},
        {"offset": -1, "status": WorklogStatus.SUBMITTED, "slots": [
            ("NIAT-Learnings", "React 19 Server Components", "Deep dive on latest React concurrency models", time(9, 30), time(12, 45), TaskPriority.HIGH, TaskStatus.COMPLETED),
            ("Mentoring", "Capstone Project Code Reviews", "PR reviews and clean code suggestions", time(13, 30), time(17, 30), TaskPriority.HIGH, TaskStatus.COMPLETED),
        ]},
        {"offset": 0, "status": WorklogStatus.DRAFT, "slots": [
            ("Internal Meetings", "Daily Morning Standup", "Kickoff and blockers", time(9, 30), time(10, 30), TaskPriority.LOW, TaskStatus.COMPLETED),
            ("NIAT-Learnings", "Full-Stack Architecture", "Studying caching strategies with Redis", time(10, 30), time(12, 0), TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS),
        ]}
    ]

    def insert_mentor_worklogs(mentor: User, schedule):
        for entry in schedule:
            w_date = today + timedelta(days=entry["offset"])
            worklog = DailyWorklog(
                mentor_id=mentor.id,
                work_date=w_date,
                status=entry["status"],
                submission_time=datetime.now(timezone.utc) if entry["status"] == WorklogStatus.SUBMITTED else None
            )
            db.add(worklog)
            db.flush()

            total_min = 0
            for slot in entry["slots"]:
                cat_name, task_name, outcome, t_start, t_end, priority, status_val = slot
                category = cat_map[cat_name]
                
                # Combine date and time (wall-clock)
                dt_start = datetime.combine(w_date, t_start)
                dt_end = datetime.combine(w_date, t_end)
                act_min = int(round((dt_end - dt_start).total_seconds() / 60))
                total_min += act_min

                activity = WorklogActivity(
                    worklog_id=worklog.id,
                    mentor_id=mentor.id,
                    category_id=category.id,
                    task_name=task_name,
                    task_description=f"Detailed execution for {task_name}",
                    outcome=outcome,
                    priority=priority,
                    status=status_val,
                    planned_minutes=act_min,
                    start_time=dt_start,
                    end_time=dt_end,
                    actual_minutes=act_min,
                    remarks="Executed according to schedule."
                )
                db.add(activity)

            worklog.total_actual_minutes = total_min
            worklog.is_target_achieved = (total_min >= 360)
            db.flush()

            if entry.get("has_feedback"):
                feedback = ManagerFeedback(
                    worklog_id=worklog.id,
                    manager_id=mentor.manager_id,
                    remarks="Excellent balance of Learning hours and Mentoring hours today! Great work resolving the cohort async deadlocks.",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(feedback)

    insert_mentor_worklogs(mentors[0], m1_days)
    insert_mentor_worklogs(mentors[1], m2_days)

    db.commit()
    db.close()

    # Also import Kushal Kumar & Vedagna's Google Sheet data
    try:
        from import_vedagna import import_data
        print("[+] Importing Kushal Kumar and Vedagna Google Sheet records...")
        import_data()
    except Exception as e:
        print(f"[-] Note: could not import Vedagna Google Sheet records: {e}")

    print("[SUCCESS] Database successfully seeded with Admin, Managers (including Kushal Kumar), Mentors (including Vedagna with 19-day Google Sheet records), Categories & worklogs!")

if __name__ == "__main__":
    seed_database()
