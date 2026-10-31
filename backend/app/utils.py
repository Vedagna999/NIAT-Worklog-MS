from datetime import datetime, date, timedelta, timezone
from typing import Optional, List
import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import WorklogActivity, DailyWorklog, ActivityCategory, ActivityGroup, TaskStatus, WorklogStatus
from app.schemas import KpiSummary, DatePillSummary, MonthlyCalendarDay
from app.config import settings
import calendar

def format_minutes_to_hours(minutes: int) -> str:
    if minutes < 0:
        minutes = 0
    h = minutes // 60
    m = minutes % 60
    return f"{h}h {m:02d}m"

def calculate_minutes(start_time: datetime, end_time: datetime) -> int:
    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be strictly after start time."
        )
    diff = end_time - start_time
    minutes = int(round(diff.total_seconds() / 60))
    if minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activity duration must be at least 1 minute."
        )
    return minutes

def validate_no_overlap(
    db: Session,
    mentor_id: uuid.UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_activity_id: Optional[uuid.UUID] = None
):
    """
    Ensures that for the mentor, no existing activity's interval [start, end)
    overlaps with the new interval [start_time, end_time).
    Overlaps condition: existing.start_time < new_end_time AND existing.end_time > new_start_time
    """
    query = db.query(WorklogActivity).filter(
        WorklogActivity.mentor_id == mentor_id,
        WorklogActivity.start_time < end_time,
        WorklogActivity.end_time > start_time
    )
    if exclude_activity_id:
        query = query.filter(WorklogActivity.id != exclude_activity_id)

    overlapping = query.first()
    if overlapping:
        start_str = overlapping.start_time.strftime("%H:%M")
        end_str = overlapping.end_time.strftime("%H:%M")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time interval overlaps with existing task '{overlapping.task_name}' ({start_str} - {end_str}). Please adjust times."
        )

def compute_kpi_summary(activities: List[WorklogActivity]) -> KpiSummary:
    total_min = 0
    qualifying_min = 0
    learning_min = 0
    completed_cnt = 0
    in_progress_cnt = 0
    blocked_cnt = 0

    for act in activities:
        mins = act.actual_minutes or 0
        total_min += mins
        
        # Check category attributes
        if act.category:
            if act.category.qualifies_for_six_hours:
                qualifying_min += mins
            if act.category.activity_group == ActivityGroup.LEARNING:
                learning_min += mins
        else:
            qualifying_min += mins

        if act.status == TaskStatus.COMPLETED:
            completed_cnt += 1
        elif act.status == TaskStatus.IN_PROGRESS:
            in_progress_cnt += 1
        elif act.status == TaskStatus.BLOCKED:
            blocked_cnt += 1

    is_achieved = qualifying_min >= settings.DAILY_TARGET_MINUTES

    return KpiSummary(
        total_minutes=total_min,
        total_formatted=format_minutes_to_hours(total_min),
        completed_count=completed_cnt,
        in_progress_count=in_progress_cnt,
        blocked_count=blocked_cnt,
        learning_minutes=learning_min,
        learning_formatted=format_minutes_to_hours(learning_min),
        is_target_achieved=is_achieved,
        qualifying_minutes=qualifying_min
    )

def recalculate_worklog_totals(db: Session, worklog: DailyWorklog):
    """
    Recalculates worklog total actual minutes and target achieved status.
    """
    # Fetch all activities with categories
    activities = db.query(WorklogActivity).filter(WorklogActivity.worklog_id == worklog.id).all()
    kpi = compute_kpi_summary(activities)
    
    worklog.total_actual_minutes = kpi.total_minutes
    worklog.is_target_achieved = kpi.is_target_achieved
    db.commit()
    db.refresh(worklog)
    return worklog, kpi

def generate_date_strip(mentor_id: uuid.UUID, selected_date: date, db: Session) -> List[DatePillSummary]:
    today = date.today()
    start_strip = selected_date - timedelta(days=10)
    end_strip = selected_date + timedelta(days=3)

    worklogs_range = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == mentor_id,
        DailyWorklog.work_date >= start_strip,
        DailyWorklog.work_date <= end_strip
    ).all()

    worklog_map = {w.work_date: w for w in worklogs_range}

    date_strip = []
    curr = start_strip
    while curr <= end_strip:
        w = worklog_map.get(curr)
        is_missing = False
        is_not_available = False

        if curr < settings.SYSTEM_START_DATE:
            # Before 11 October: worklogs were recorded in Google Sheets
            # Not available in portal, but NOT missing/pending (no red color)
            if not w or w.total_actual_minutes == 0:
                is_not_available = True
        elif curr < today and curr.weekday() != 6:  # not Sunday
            if not w or w.status != WorklogStatus.SUBMITTED or w.total_actual_minutes == 0:
                is_missing = True

        date_strip.append(DatePillSummary(
            work_date=curr,
            status=w.status if w else None,
            total_minutes=w.total_actual_minutes if w else 0,
            is_target_achieved=w.is_target_achieved if w else False,
            activity_count=len(w.activities) if w and w.activities else 0,
            learning_minutes=0,
            is_missing=is_missing,
            is_not_available=is_not_available
        ))
        curr += timedelta(days=1)
    return date_strip

def generate_monthly_calendar_days(mentor_id: uuid.UUID, year: int, month: int, db: Session) -> List[MonthlyCalendarDay]:
    today = date.today()
    num_days = calendar.monthrange(year, month)[1]
    first_date = date(year, month, 1)
    last_date = date(year, month, num_days)

    worklogs = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == mentor_id,
        DailyWorklog.work_date >= first_date,
        DailyWorklog.work_date <= last_date
    ).all()
    worklog_map = {w.work_date: w for w in worklogs}

    days_list = []
    for day in range(1, num_days + 1):
        d = date(year, month, day)
        w = worklog_map.get(d)
        is_weekend = (d.weekday() == 6)  # Sunday
        is_future = (d > today)
        is_today = (d == today)

        is_missing = False
        is_not_available = False

        if d < settings.SYSTEM_START_DATE:
            # Before 11 October: worklogs were in Google Sheets
            if not w or w.total_actual_minutes == 0:
                is_not_available = True
        elif d < today and not is_weekend:
            if not w or w.status != WorklogStatus.SUBMITTED or w.total_actual_minutes == 0:
                is_missing = True

        mins = w.total_actual_minutes if w else 0
        h = mins // 60
        m = mins % 60
        fmt = f"{h}h {m:02d}m"

        days_list.append(MonthlyCalendarDay(
            work_date=d,
            day_number=day,
            is_current_month=True,
            is_today=is_today,
            is_future=is_future,
            is_weekend=is_weekend,
            status=w.status if w else None,
            total_minutes=mins,
            total_formatted=fmt,
            is_target_achieved=w.is_target_achieved if w else False,
            is_missing=is_missing,
            is_not_available=is_not_available,
            activity_count=len(w.activities) if w and w.activities else 0
        ))
    return days_list
