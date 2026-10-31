import uuid
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    DailyWorklog,
    WorklogActivity,
    ActivityCategory,
    ManagerFeedback,
    User,
    UserRole,
    WorklogStatus,
    ActivityGroup
)
from app.schemas import (
    DailyWorklogOut,
    ActivityCreate,
    ActivityUpdate,
    ActivityOut,
    FeedbackOut,
    DailyWorklogStatusUpdate,
    MissingWorklogItem,
    MonthlyCalendarDay
)
from app.auth import get_current_user
from app.utils import (
    calculate_minutes,
    validate_no_overlap,
    recalculate_worklog_totals,
    compute_kpi_summary,
    generate_date_strip,
    generate_monthly_calendar_days,
    format_minutes_to_hours
)
from app.config import settings

router = APIRouter(prefix="/api/worklogs", tags=["Worklogs"])

def verify_editable(worklog: DailyWorklog, user: User):
    if user.role == UserRole.ADMIN:
        return # Admin can always edit
    if worklog.status == WorklogStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This worklog is LOCKED and cannot be modified. Contact an administrator to reopen."
        )
    # Check editing deadline
    days_diff = (date.today() - worklog.work_date).days
    if days_diff > settings.EDITING_DEADLINE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Editing window closed. Past dates can only be edited within {settings.EDITING_DEADLINE_DAYS} days."
        )

@router.get("/daily", response_model=DailyWorklogOut)
def get_daily_worklog(
    target_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not target_date:
        target_date = date.today()

    # Mentors can only query their own worklog
    mentor_id = current_user.id

    worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == mentor_id,
        DailyWorklog.work_date == target_date
    ).first()

    if not worklog:
        # Create empty draft worklog for this date
        worklog = DailyWorklog(
            mentor_id=mentor_id,
            work_date=target_date,
            status=WorklogStatus.DRAFT,
            total_actual_minutes=0,
            is_target_achieved=False
        )
        db.add(worklog)
        db.commit()
        db.refresh(worklog)

    activities = db.query(WorklogActivity).filter(
        WorklogActivity.worklog_id == worklog.id
    ).order_by(WorklogActivity.start_time.asc()).all()

    kpi = compute_kpi_summary(activities)
    feedbacks = db.query(ManagerFeedback).filter(
        ManagerFeedback.worklog_id == worklog.id
    ).order_by(ManagerFeedback.created_at.desc()).all()

    res = DailyWorklogOut.model_validate(worklog)
    res.activities = [ActivityOut.model_validate(a) for a in activities]
    res.feedbacks = [FeedbackOut.model_validate(fb) for fb in feedbacks]
    res.kpi_summary = kpi
    res.date_strip = generate_date_strip(current_user.id, target_date, db)
    return res

@router.get("/missing", response_model=List[MissingWorklogItem])
def get_missing_worklogs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    # Data prior to 11 Oct 2026 was recorded in Google Sheets; never flag as missing
    start_check = max(today - timedelta(days=14), settings.SYSTEM_START_DATE)
    if start_check >= today:
        return []

    worklogs = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == current_user.id,
        DailyWorklog.work_date >= start_check,
        DailyWorklog.work_date < today
    ).all()
    worklog_map = {w.work_date: w for w in worklogs}

    missing = []
    curr = start_check
    while curr < today:
        if curr.weekday() != 6:  # Exclude Sundays
            w = worklog_map.get(curr)
            if not w or w.status != WorklogStatus.SUBMITTED or w.total_actual_minutes == 0:
                missing.append(MissingWorklogItem(
                    work_date=curr,
                    formatted_date=curr.strftime("%d %b %Y"),
                    day_name=curr.strftime("%a"),
                    days_ago=(today - curr).days
                ))
        curr += timedelta(days=1)
    return missing

@router.get("/monthly", response_model=List[MonthlyCalendarDay])
def get_monthly_worklogs(
    month: Optional[str] = Query(None, description="Month format YYYY-MM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if month:
        try:
            parts = month.split("-")
            year = int(parts[0])
            m = int(parts[1])
        except Exception:
            year, m = date.today().year, date.today().month
    else:
        year, m = date.today().year, date.today().month
    
    return generate_monthly_calendar_days(current_user.id, year, m, db)

@router.get("/learning")
def get_mentor_learning_records(
    search: Optional[str] = Query(None),
    date_range: Optional[str] = Query("all"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_

    query = db.query(WorklogActivity).join(DailyWorklog).join(ActivityCategory).filter(
        WorklogActivity.mentor_id == current_user.id
    )

    # Filter for learning activities
    query = query.filter(
        or_(
            ActivityCategory.activity_group == ActivityGroup.LEARNING,
            ActivityCategory.name.ilike("%learning%"),
            WorklogActivity.task_name.ilike("%upskilling%"),
            WorklogActivity.task_name.ilike("%learn%")
        )
    )

    today = date.today()
    if date_range == "7d":
        query = query.filter(DailyWorklog.work_date >= today - timedelta(days=7))
    elif date_range == "30d":
        query = query.filter(DailyWorklog.work_date >= today - timedelta(days=30))
    elif date_range == "custom":
        if start_date:
            query = query.filter(DailyWorklog.work_date >= start_date)
        if end_date:
            query = query.filter(DailyWorklog.work_date <= end_date)

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                WorklogActivity.task_name.ilike(s),
                WorklogActivity.outcome.ilike(s),
                WorklogActivity.task_description.ilike(s)
            )
        )

    activities = query.order_by(DailyWorklog.work_date.desc(), WorklogActivity.start_time.desc()).all()

    intervals = [(a.start_time, a.end_time) for a in activities if a.start_time and a.end_time]
    sorted_int = sorted(intervals, key=lambda x: x[0])
    merged = []
    for s, e in sorted_int:
        if not merged:
            merged.append([s, e])
        else:
            if s < merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
    total_mins = int(round(sum((e - s).total_seconds() for s, e in merged) / 60)) if merged else 0

    topics = list(dict.fromkeys(a.task_name.strip() for a in activities if a.task_name))
    outcomes_count = len([a for a in activities if a.outcome and a.outcome.strip()])

    act_list = []
    for a in activities:
        w_date = a.worklog.work_date if a.worklog else a.start_time.date()
        act_list.append({
            "id": a.id,
            "worklog_id": a.worklog_id,
            "work_date": w_date,
            "formatted_date": w_date.strftime("%d %b %Y"),
            "task_name": a.task_name,
            "task_description": a.task_description,
            "outcome": a.outcome,
            "start_time_formatted": a.start_time.strftime("%H:%M") if a.start_time else "--:--",
            "end_time_formatted": a.end_time.strftime("%H:%M") if a.end_time else "--:--",
            "actual_minutes": a.actual_minutes,
            "duration_formatted": format_minutes_to_hours(a.actual_minutes),
            "category_name": a.category.name if a.category else "NIAT-Learnings"
        })

    return {
        "total_learning_minutes": total_mins,
        "total_learning_hours": format_minutes_to_hours(total_mins),
        "distinct_topics_count": len(topics),
        "total_activities_count": len(activities),
        "practical_outcomes_count": outcomes_count,
        "topics": topics,
        "activities": act_list
    }


@router.post("/daily/status", response_model=DailyWorklogOut)
def update_daily_worklog_status(
    status_update: DailyWorklogStatusUpdate,
    target_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not target_date:
        target_date = date.today()

    worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == current_user.id,
        DailyWorklog.work_date == target_date
    ).first()

    if not worklog:
        worklog = DailyWorklog(
            mentor_id=current_user.id,
            work_date=target_date,
            status=WorklogStatus.DRAFT,
            total_actual_minutes=0,
            is_target_achieved=False
        )
        db.add(worklog)
        db.flush()

    verify_editable(worklog, current_user)

    worklog.status = status_update.status
    if status_update.status == WorklogStatus.SUBMITTED:
        worklog.submission_time = datetime.now(timezone.utc)
    
    recalculate_worklog_totals(db, worklog)
    db.commit()
    db.refresh(worklog)

    activities = db.query(WorklogActivity).filter(
        WorklogActivity.worklog_id == worklog.id
    ).order_by(WorklogActivity.start_time.asc()).all()

    feedbacks = db.query(ManagerFeedback).filter(
        ManagerFeedback.worklog_id == worklog.id
    ).order_by(ManagerFeedback.created_at.desc()).all()

    kpi = compute_kpi_summary(activities)
    res = DailyWorklogOut.model_validate(worklog)
    res.activities = [ActivityOut.model_validate(a) for a in activities]
    res.feedbacks = [FeedbackOut.model_validate(fb) for fb in feedbacks]
    res.kpi_summary = kpi
    res.date_strip = generate_date_strip(current_user.id, target_date, db)
    return res

@router.post("/activities", response_model=ActivityOut)
def add_activity(
    activity_in: ActivityCreate,
    target_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Determine the work date
    work_date = activity_in.work_date or target_date or activity_in.start_time.date()

    # Find or create daily worklog
    worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == current_user.id,
        DailyWorklog.work_date == work_date
    ).first()

    if not worklog:
        worklog = DailyWorklog(
            mentor_id=current_user.id,
            work_date=work_date,
            status=WorklogStatus.DRAFT,
            total_actual_minutes=0,
            is_target_achieved=False
        )
        db.add(worklog)
        db.flush()

    verify_editable(worklog, current_user)

    # Validate category exists
    category = db.query(ActivityCategory).filter(ActivityCategory.id == activity_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity category not found."
        )

    # Normalize times to wall-clock naive datetimes
    start_time = activity_in.start_time.replace(tzinfo=None) if activity_in.start_time.tzinfo else activity_in.start_time
    end_time = activity_in.end_time.replace(tzinfo=None) if activity_in.end_time.tzinfo else activity_in.end_time

    # Validate duration and times
    actual_mins = calculate_minutes(start_time, end_time)

    # Validate anti-overlap constraint
    validate_no_overlap(
        db=db,
        mentor_id=current_user.id,
        start_time=start_time,
        end_time=end_time
    )

    activity = WorklogActivity(
        worklog_id=worklog.id,
        mentor_id=current_user.id,
        category_id=activity_in.category_id,
        task_name=activity_in.task_name,
        task_description=activity_in.task_description,
        outcome=activity_in.outcome,
        priority=activity_in.priority,
        status=activity_in.status,
        planned_minutes=activity_in.planned_minutes or actual_mins,
        start_time=start_time,
        end_time=end_time,
        actual_minutes=actual_mins,
        remarks=activity_in.remarks,
        dependencies=activity_in.dependencies,
        deviations=activity_in.deviations
    )
    db.add(activity)
    db.flush()

    recalculate_worklog_totals(db, worklog)
    db.refresh(activity)
    return ActivityOut.model_validate(activity)

@router.put("/activities/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: uuid.UUID,
    activity_update: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    activity = db.query(WorklogActivity).filter(WorklogActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")

    if activity.mentor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own activities.")

    worklog = db.query(DailyWorklog).filter(DailyWorklog.id == activity.worklog_id).first()
    if not worklog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated worklog not found.")

    verify_editable(worklog, current_user)

    start_time = activity_update.start_time or activity.start_time
    end_time = activity_update.end_time or activity.end_time
    if start_time and start_time.tzinfo:
        start_time = start_time.replace(tzinfo=None)
    if end_time and end_time.tzinfo:
        end_time = end_time.replace(tzinfo=None)

    if activity_update.start_time is not None or activity_update.end_time is not None:
        actual_mins = calculate_minutes(start_time, end_time)
        validate_no_overlap(
            db=db,
            mentor_id=activity.mentor_id,
            start_time=start_time,
            end_time=end_time,
            exclude_activity_id=activity.id
        )
        activity.start_time = start_time
        activity.end_time = end_time
        activity.actual_minutes = actual_mins

    if activity_update.category_id is not None:
        category = db.query(ActivityCategory).filter(ActivityCategory.id == activity_update.category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
        activity.category_id = activity_update.category_id

    if activity_update.task_name is not None:
        activity.task_name = activity_update.task_name
    if activity_update.task_description is not None:
        activity.task_description = activity_update.task_description
    if activity_update.outcome is not None:
        activity.outcome = activity_update.outcome
    if activity_update.priority is not None:
        activity.priority = activity_update.priority
    if activity_update.status is not None:
        activity.status = activity_update.status
    if activity_update.planned_minutes is not None:
        activity.planned_minutes = activity_update.planned_minutes
    if activity_update.remarks is not None:
        activity.remarks = activity_update.remarks
    if activity_update.dependencies is not None:
        activity.dependencies = activity_update.dependencies
    if activity_update.deviations is not None:
        activity.deviations = activity_update.deviations

    db.flush()
    recalculate_worklog_totals(db, worklog)
    db.refresh(activity)
    return ActivityOut.model_validate(activity)

@router.delete("/activities/{activity_id}")
def delete_activity(
    activity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    activity = db.query(WorklogActivity).filter(WorklogActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")

    if activity.mentor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own activities.")

    worklog = db.query(DailyWorklog).filter(DailyWorklog.id == activity.worklog_id).first()
    if worklog:
        verify_editable(worklog, current_user)

    db.delete(activity)
    db.flush()

    if worklog:
        recalculate_worklog_totals(db, worklog)

    return {"message": "Activity deleted successfully", "id": str(activity_id)}
