from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ActivityCategory, User, UserRole
from app.schemas import CategoryOut, CategoryCreate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/categories", tags=["Categories"])

TASK_TEMPLATES: Dict[str, List[Dict[str, str]]] = {
    "NIAT-Learnings": [
        {"name": "Full-Stack Architecture & System Design Study", "description": "Studying scalable backend architectures and React patterns", "outcome": "Completed modules on high-throughput microservices"},
        {"name": "DSA Mastery & Advanced Problem Solving", "description": "Practicing graph algorithms and dynamic programming patterns", "outcome": "Solved 4 hard LeetCode problems"},
        {"name": "AI Tools & Developer Productivity Workshop", "description": "Exploring agentic coding workflows and LLM APIs", "outcome": "Built a prototype tool integration"},
        {"name": "Database Query Optimization & Indexing", "description": "PostgreSQL indexing, query plans, and connection pooling", "outcome": "Documented query performance benchmarks"},
        {"name": "React 19 Server Components & Concurrency", "description": "Deep dive into server actions and streaming SSR", "outcome": "Built a demonstration prototype with streaming UI"}
    ],
    "Mentoring": [
        {"name": "1-on-1 Student Doubt Clearing Session", "description": "Resolved individual blockers on web development projects", "outcome": "Assisted 6 students with asynchronous state handling"},
        {"name": "Project Code Review & Refactoring Walkthrough", "description": "Reviewing student PRs and advising on clean code principles", "outcome": "Reviewed 12 student repositories"},
        {"name": "Technical Mock Interview & Feedback", "description": "Conducting 45-min technical interviews with structured rubric", "outcome": "Provided actionable rubrics and tips to 3 students"},
        {"name": "Cohort Group Discussion & Live Coding Demo", "description": "Live walkthrough of state management and API integration", "outcome": "High engagement session with 45 attendees"}
    ],
    "Invigilation": [
        {"name": "Weekly Coding Assessment Proctoring", "description": "Active monitoring of timed algorithmic assessment", "outcome": "Clean session conducted with zero malpractice flags"},
        {"name": "Monthly Milestone Exam Supervision", "description": "Proctoring live environment test session", "outcome": "Logged student attendance and submitted evaluation sheet"},
        {"name": "Plagiarism & Code Similarity Audit", "description": "Analyzing code submissions through integrity scanning tools", "outcome": "Compiled integrity verification summary"}
    ],
    "Evaluation & Grading": [
        {"name": "Code Assessment Grading & Benchmarking", "description": "Evaluating student test submissions against rubric", "outcome": "Graded 35 student algorithmic submissions"},
        {"name": "Sprint Project Milestone Grading", "description": "Evaluating GitHub repository code quality and test coverage", "outcome": "Graded and provided feedback on 14 capstone repositories"},
        {"name": "Viva & Concept Comprehension Assessment", "description": "1-on-1 oral technical evaluation of sprint concepts", "outcome": "Assessed 8 learners on data structures"}
    ],
    "Content Prep": [
        {"name": "Lab Exercise Preparation & Test Case Writing", "description": "Authoring automated test assertions for weekly practice problem", "outcome": "Authored 10 automated test suites with edge cases"},
        {"name": "Curriculum Problem Formulation & Solution Drafting", "description": "Drafting reference solutions and explanation notes", "outcome": "Created 3 multi-step practice challenges with reference solutions"},
        {"name": "Slide Deck & Reference Material Update", "description": "Updating documentation and code snippets for upcoming lecture", "outcome": "Refreshed sprint 5 reference slides and repository"}
    ],
    "Internal Meetings": [
        {"name": "Daily Morning Standup", "description": "Status updates on cohort progress and blocker identification", "outcome": "Aligned on daily agenda and student escalations"},
        {"name": "Weekly Mentor Alignment & Retrospective", "description": "Discussing curriculum pacing and mentor allocation", "outcome": "Defined action items for upcoming sprint"},
        {"name": "Student Success Review Meeting", "description": "Reviewing at-risk learners and tailored intervention plans", "outcome": "Assigned dedicated mentoring slots for 8 learners"}
    ],
    "Administrative": [
        {"name": "Attendance Verification & Batch Reporting", "description": "Verifying daily session attendance and updating tracking logs", "outcome": "Completed daily cohort attendance reports"},
        {"name": "Cohort Operations & Scheduling Coordination", "description": "Coordinating lab schedules, zoom links, and slot calendar", "outcome": "Published next week mentoring calendar schedule"},
        {"name": "Curriculum Escalations & Student Ticket Triage", "description": "Managing learner support tickets and routing escalations", "outcome": "Resolved and closed 18 support tickets"}
    ]
}

@router.get("", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(ActivityCategory).order_by(ActivityCategory.name).all()
    return categories

@router.get("/templates")
def get_task_templates():
    return TASK_TEMPLATES

@router.post("", response_model=CategoryOut)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    existing = db.query(ActivityCategory).filter(ActivityCategory.name == cat_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{cat_in.name}' already exists."
        )
    category = ActivityCategory(
        name=cat_in.name,
        activity_group=cat_in.activity_group,
        qualifies_for_six_hours=cat_in.qualifies_for_six_hours
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
