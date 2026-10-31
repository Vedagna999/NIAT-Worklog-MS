import uuid
from datetime import date, datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    User,
    UserRole,
    DailyWorklog,
    WorklogActivity,
    MentorSkill,
    SkillGrowthLog,
    SkillCategoryType,
    SkillStatus
)
from app.schemas import (
    MentorSkillCreate,
    MentorSkillUpdate,
    MentorSkillOut,
    SkillGrowthLogOut,
    SkillUpskillRequest,
    MentorSkillsProfileSummary,
    RecentlyUpskilledItem,
    SkillGrowthTimeline,
    SkillGrowthTimelinePoint,
    ManagerMentorSkillsView
)
from app.auth import get_current_user, require_role
from app.routers.manager import check_mentor_access

router = APIRouter(prefix="/api/skills", tags=["Mentor Skills & Growth"])

PREDEFINED_SKILLS = {
    "technical": [
        "Python",
        "JavaScript",
        "TypeScript",
        "React",
        "Node.js",
        "Express.js",
        "SQL",
        "PostgreSQL",
        "MongoDB",
        "Java",
        "Spring Boot",
        "C++",
        "C# / .NET",
        "AI / ML",
        "Prompt Engineering",
        "Large Language Models (LLMs)",
        "Data Structures & Algorithms",
        "HTML / CSS",
        "Tailwind CSS",
        "Next.js",
        "Docker",
        "Kubernetes",
        "Git & GitHub",
        "REST APIs",
        "GraphQL",
        "FastAPI",
        "Flask",
        "Django",
        "Cloud Computing (AWS / GCP / Azure)",
        "System Design",
        "DevOps & CI/CD",
        "Testing & QA (Jest / Pytest)"
    ],
    "non_technical": [
        "Mentoring & Coaching",
        "Technical Communication",
        "Code Review & Feedback",
        "Curriculum & Content Development",
        "Problem Solving & Debugging Guidance",
        "Student Evaluation & Assessment",
        "Presentation & Public Speaking",
        "Time Management",
        "Team Leadership & Collaboration"
    ]
}

def validate_rating_increment(rating: float) -> float:
    # Ensure rating is between 0.5 and 5.0 and in half-star increments
    if rating < 0.5 or rating > 5.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confidence rating must be between 0.5 and 5.0 stars."
        )
    # Check if it's a multiple of 0.5 (allowing for small float inaccuracies)
    rounded = round(rating * 2) / 2
    if abs(rating - rounded) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confidence rating must be in half-star increments (0.5, 1.0, 1.5, ..., 5.0)."
        )
    return rounded

def build_growth_log_out(log: SkillGrowthLog, skill_name: Optional[str] = None) -> SkillGrowthLogOut:
    task_name = None
    outcome = None
    if log.activity:
        task_name = log.activity.task_name
        outcome = log.activity.outcome

    return SkillGrowthLogOut(
        id=log.id,
        mentor_skill_id=log.mentor_skill_id,
        skill_name=skill_name or (log.skill.skill_name if log.skill else None),
        mentor_id=log.mentor_id,
        worklog_id=log.worklog_id,
        activity_id=log.activity_id,
        log_date=log.log_date,
        formatted_date=log.log_date.strftime("%d %b %Y"),
        previous_rating=log.previous_rating,
        new_rating=log.new_rating,
        status=log.status,
        notes=log.notes,
        activity_task_name=task_name,
        activity_outcome=outcome,
        created_at=log.created_at
    )

def build_skill_out(skill: MentorSkill) -> MentorSkillOut:
    logs = [build_growth_log_out(l, skill.skill_name) for l in skill.growth_logs]
    return MentorSkillOut(
        id=skill.id,
        mentor_id=skill.mentor_id,
        skill_name=skill.skill_name,
        category_type=skill.category_type,
        confidence_rating=skill.confidence_rating,
        status=skill.status,
        notes=skill.notes,
        created_at=skill.created_at,
        updated_at=skill.updated_at,
        last_updated_formatted=skill.updated_at.strftime("%d %b %Y"),
        growth_count=len(logs),
        growth_logs=logs
    )

def build_skills_summary(mentor: User, db: Session) -> MentorSkillsProfileSummary:
    skills = db.query(MentorSkill).filter(MentorSkill.mentor_id == mentor.id).order_by(MentorSkill.skill_name).all()
    skill_outs = [build_skill_out(s) for s in skills]

    tech_count = sum(1 for s in skills if s.category_type == SkillCategoryType.TECHNICAL)
    non_tech_count = sum(1 for s in skills if s.category_type == SkillCategoryType.NON_TECHNICAL)
    curr_learning = sum(1 for s in skills if s.status == SkillStatus.CURRENTLY_LEARNING)
    familiar = sum(1 for s in skills if s.status == SkillStatus.FAMILIAR)
    proficient = sum(1 for s in skills if s.status == SkillStatus.PROFICIENT)
    
    avg_confidence = 0.0
    if skills:
        avg_confidence = round(sum(s.confidence_rating for s in skills) / len(skills), 2)

    return MentorSkillsProfileSummary(
        mentor_id=mentor.id,
        mentor_name=mentor.full_name,
        mentor_email=mentor.email,
        is_profile_completed=len(skills) > 0,
        total_skills=len(skills),
        technical_skills_count=tech_count,
        non_technical_skills_count=non_tech_count,
        currently_learning_count=curr_learning,
        familiar_count=familiar,
        proficient_count=proficient,
        average_confidence=avg_confidence,
        skills=skill_outs
    )

# ---------------------------------------------------------------------------
# Predefined skills list
# ---------------------------------------------------------------------------
@router.get("/predefined")
def get_predefined_skills():
    return PREDEFINED_SKILLS

# ---------------------------------------------------------------------------
# Mentor: Get own profile and skills
# ---------------------------------------------------------------------------
@router.get("/me", response_model=MentorSkillsProfileSummary)
def get_my_skills_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return build_skills_summary(current_user, db)

# ---------------------------------------------------------------------------
# Mentor: Add a skill to profile
# ---------------------------------------------------------------------------
@router.post("/me", response_model=MentorSkillOut)
def add_my_skill(
    skill_in: MentorSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cleaned_name = skill_in.skill_name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill name cannot be empty.")

    rating = validate_rating_increment(skill_in.confidence_rating)

    # Check for duplicate
    existing = db.query(MentorSkill).filter(
        MentorSkill.mentor_id == current_user.id,
        func.lower(MentorSkill.skill_name) == cleaned_name.lower()
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Skill '{cleaned_name}' is already in your skills profile. You can update its rating instead."
        )

    now = datetime.now(timezone.utc)
    new_skill = MentorSkill(
        mentor_id=current_user.id,
        skill_name=cleaned_name,
        category_type=skill_in.category_type,
        confidence_rating=rating,
        status=skill_in.status,
        notes=skill_in.notes,
        created_at=now,
        updated_at=now
    )
    db.add(new_skill)
    db.flush()

    # Create baseline growth log
    growth_log = SkillGrowthLog(
        mentor_skill_id=new_skill.id,
        mentor_id=current_user.id,
        previous_rating=None,
        new_rating=rating,
        status=skill_in.status,
        log_date=date.today(),
        notes=skill_in.notes or "Initial self-assessed confidence rating",
        created_at=now
    )
    db.add(growth_log)
    db.commit()
    db.refresh(new_skill)

    return build_skill_out(new_skill)

# ---------------------------------------------------------------------------
# Mentor: Update a skill in profile
# ---------------------------------------------------------------------------
@router.put("/me/{skill_id}", response_model=MentorSkillOut)
def update_my_skill(
    skill_id: uuid.UUID,
    update_in: MentorSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    skill = db.query(MentorSkill).filter(
        MentorSkill.id == skill_id,
        MentorSkill.mentor_id == current_user.id
    ).first()

    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found in your profile.")

    previous_rating = skill.confidence_rating
    rating_changed = False
    now = datetime.now(timezone.utc)

    if update_in.confidence_rating is not None:
        new_val = validate_rating_increment(update_in.confidence_rating)
        if new_val != skill.confidence_rating:
            skill.confidence_rating = new_val
            rating_changed = True

    if update_in.status is not None:
        skill.status = update_in.status

    if update_in.category_type is not None:
        skill.category_type = update_in.category_type

    if update_in.notes is not None:
        skill.notes = update_in.notes

    skill.updated_at = now

    # If rating changed or notes provided, record a growth log
    if rating_changed or (update_in.notes and update_in.notes.strip()):
        growth_log = SkillGrowthLog(
            mentor_skill_id=skill.id,
            mentor_id=current_user.id,
            previous_rating=previous_rating,
            new_rating=skill.confidence_rating,
            status=skill.status,
            log_date=date.today(),
            notes=update_in.notes or f"Updated confidence from {previous_rating} to {skill.confidence_rating} stars",
            created_at=now
        )
        db.add(growth_log)

    db.commit()
    db.refresh(skill)
    return build_skill_out(skill)

# ---------------------------------------------------------------------------
# Mentor: Remove a skill from profile
# ---------------------------------------------------------------------------
@router.delete("/me/{skill_id}")
def delete_my_skill(
    skill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    skill = db.query(MentorSkill).filter(
        MentorSkill.id == skill_id,
        MentorSkill.mentor_id == current_user.id
    ).first()

    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")

    skill_name = skill.skill_name
    db.delete(skill)
    db.commit()
    return {"message": f"Skill '{skill_name}' successfully removed from your profile."}

# ---------------------------------------------------------------------------
# Mentor: Record upskilling event (linked to daily worklog / activity)
# ---------------------------------------------------------------------------
@router.post("/me/upskill", response_model=MentorSkillOut)
def record_skill_upskilling(
    upskill_in: SkillUpskillRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rating = validate_rating_increment(upskill_in.confidence_rating)
    now = datetime.now(timezone.utc)
    log_date = upskill_in.log_date or date.today()

    skill: Optional[MentorSkill] = None

    if upskill_in.skill_id:
        skill = db.query(MentorSkill).filter(
            MentorSkill.id == upskill_in.skill_id,
            MentorSkill.mentor_id == current_user.id
        ).first()
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenced skill not found.")
    elif upskill_in.skill_name and upskill_in.skill_name.strip():
        name_clean = upskill_in.skill_name.strip()
        skill = db.query(MentorSkill).filter(
            MentorSkill.mentor_id == current_user.id,
            func.lower(MentorSkill.skill_name) == name_clean.lower()
        ).first()

        if not skill:
            # Create new skill
            skill = MentorSkill(
                mentor_id=current_user.id,
                skill_name=name_clean,
                category_type=upskill_in.category_type,
                confidence_rating=rating,
                status=upskill_in.status or SkillStatus.CURRENTLY_LEARNING,
                notes=upskill_in.notes,
                created_at=now,
                updated_at=now
            )
            db.add(skill)
            db.flush()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either skill_id or skill_name."
        )

    previous_rating = skill.confidence_rating
    skill.confidence_rating = rating
    if upskill_in.status:
        skill.status = upskill_in.status
    skill.updated_at = now

    # Verify worklog/activity if provided
    if upskill_in.activity_id:
        act = db.query(WorklogActivity).filter(
            WorklogActivity.id == upskill_in.activity_id,
            WorklogActivity.mentor_id == current_user.id
        ).first()
        if act and not upskill_in.worklog_id:
            upskill_in.worklog_id = act.worklog_id

    # Create growth log
    growth_log = SkillGrowthLog(
        mentor_skill_id=skill.id,
        mentor_id=current_user.id,
        worklog_id=upskill_in.worklog_id,
        activity_id=upskill_in.activity_id,
        previous_rating=previous_rating,
        new_rating=rating,
        status=skill.status,
        log_date=log_date,
        notes=upskill_in.notes,
        created_at=now
    )
    db.add(growth_log)
    db.commit()
    db.refresh(skill)

    return build_skill_out(skill)

# ---------------------------------------------------------------------------
# Manager: View assigned mentor's skills & growth dashboard
# ---------------------------------------------------------------------------
@router.get("/manager/mentors/{mentor_id}", response_model=ManagerMentorSkillsView)
def get_mentor_skills_for_manager(
    mentor_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    mentor = check_mentor_access(current_user, mentor_id, db)
    summary = build_skills_summary(mentor, db)

    # 1. Recently Upskilled: All growth logs in chronological order, newest first
    growth_logs = (
        db.query(SkillGrowthLog)
        .join(MentorSkill, SkillGrowthLog.mentor_skill_id == MentorSkill.id)
        .filter(SkillGrowthLog.mentor_id == mentor.id)
        .order_by(SkillGrowthLog.log_date.desc(), SkillGrowthLog.created_at.desc())
        .limit(50)
        .all()
    )

    recently_upskilled: List[RecentlyUpskilledItem] = []
    for gl in growth_logs:
        task_name = gl.activity.task_name if gl.activity else None
        recently_upskilled.append(
            RecentlyUpskilledItem(
                id=gl.id,
                skill_id=gl.mentor_skill_id,
                skill_name=gl.skill.skill_name,
                category_type=gl.skill.category_type,
                date=gl.log_date,
                formatted_date=gl.log_date.strftime("%d %b %Y"),
                previous_rating=gl.previous_rating,
                current_rating=gl.new_rating,
                status=gl.status,
                notes=gl.notes,
                worklog_id=gl.worklog_id,
                activity_id=gl.activity_id,
                activity_task_name=task_name
            )
        )

    # 2. Skill Growth Timelines: For each skill, track rating progression over time
    growth_timelines: List[SkillGrowthTimeline] = []
    skills = db.query(MentorSkill).filter(MentorSkill.mentor_id == mentor.id).order_by(MentorSkill.skill_name).all()

    for s in skills:
        # Logs in chronological order (oldest to newest)
        skill_logs = (
            db.query(SkillGrowthLog)
            .filter(SkillGrowthLog.mentor_skill_id == s.id)
            .order_by(SkillGrowthLog.log_date.asc(), SkillGrowthLog.created_at.asc())
            .all()
        )

        history_points: List[SkillGrowthTimelinePoint] = []
        initial_rating = s.confidence_rating
        if skill_logs:
            initial_rating = skill_logs[0].new_rating
            for p in skill_logs:
                change = 0.0
                if p.previous_rating is not None:
                    change = round(p.new_rating - p.previous_rating, 1)
                history_points.append(
                    SkillGrowthTimelinePoint(
                        date=p.log_date,
                        formatted_date=p.log_date.strftime("%d %b %Y"),
                        rating=p.new_rating,
                        previous_rating=p.previous_rating,
                        rating_change=change,
                        notes=p.notes,
                        activity_id=p.activity_id,
                        worklog_id=p.worklog_id
                    )
                )

        total_growth = round(s.confidence_rating - initial_rating, 1)
        growth_timelines.append(
            SkillGrowthTimeline(
                skill_name=s.skill_name,
                category_type=s.category_type,
                current_rating=s.confidence_rating,
                initial_rating=initial_rating,
                total_growth=total_growth,
                history=history_points
            )
        )

    manager_name = mentor.manager.full_name if mentor.manager else None

    return ManagerMentorSkillsView(
        mentor_id=mentor.id,
        mentor_name=mentor.full_name,
        mentor_email=mentor.email,
        manager_name=manager_name,
        summary=summary,
        skills=summary.skills,
        recently_upskilled=recently_upskilled,
        growth_timelines=growth_timelines
    )
