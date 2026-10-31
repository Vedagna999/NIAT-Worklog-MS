import uuid
import re
from datetime import date, datetime, timedelta, timezone
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
    ManagerFeedback,
    ActivityGroup,
    ActivityCategory,
    TaskStatus,
    WorklogStatus
)
from app.schemas import (
    UserBrief,
    DailyWorklogOut,
    ActivityOut,
    FeedbackCreate,
    ManagerFeedbackDirectCreate,
    FeedbackOut,
    KpiSummary,
    DatePillSummary,
    ManagerDashboardView,
    MentorRosterItem,
    MonthlyCalendarDay,
    TopicLearningItem,
    PracticalOutcomeItem,
    WeeklyLearningTrendItem,
    CategoryTimeDistributionItem,
    WorklogExceptionItem,
    LearningOverviewSummary,
    MentorPerformanceOverviewOut,
    SkillFinderActivityItem,
    SkillFinderMentorResult,
    SkillFinderSearchResponse
)
from app.auth import get_current_user, require_role
from app.utils import compute_kpi_summary, format_minutes_to_hours, generate_date_strip, generate_monthly_calendar_days
from app.config import settings
import calendar

router = APIRouter(prefix="/api/manager", tags=["Manager Portal"])

def get_authorized_mentors(manager: User, db: Session) -> List[User]:
    if manager.role == UserRole.ADMIN:
        return db.query(User).filter(User.role == UserRole.MENTOR).order_by(User.full_name).all()
    else:
        return db.query(User).filter(
            User.role == UserRole.MENTOR,
            User.manager_id == manager.id
        ).order_by(User.full_name).all()

def check_mentor_access(manager: User, mentor_id: uuid.UUID, db: Session) -> User:
    mentor = db.query(User).filter(User.id == mentor_id, User.role == UserRole.MENTOR).first()
    if not mentor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found.")
    
    if manager.role != UserRole.ADMIN and mentor.manager_id != manager.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: This mentor is not assigned to you."
        )
    return mentor

@router.get("/mentors", response_model=List[MentorRosterItem])
def list_assigned_mentors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    mentors = get_authorized_mentors(current_user, db)
    today = date.today()

    result = []
    for m in mentors:
        today_worklog = db.query(DailyWorklog).filter(
            DailyWorklog.mentor_id == m.id,
            DailyWorklog.work_date == today
        ).first()

        result.append(MentorRosterItem(
            id=m.id,
            full_name=m.full_name,
            email=m.email,
            status=m.status,
            today_status=today_worklog.status if today_worklog else None,
            today_minutes=today_worklog.total_actual_minutes if today_worklog else 0,
            today_target_achieved=today_worklog.is_target_achieved if today_worklog else False
        ))
    return result

@router.get("/team-overview")
def get_team_overview(
    period: str = Query("month", pattern="^(week|month|last_month|custom)$"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    mentors = get_authorized_mentors(current_user, db)
    today = date.today()

    # Determine date boundaries
    if period == "week":
        calc_start = today - timedelta(days=today.weekday())
        calc_end = today
    elif period == "month":
        calc_start = date(today.year, today.month, 1)
        calc_end = today
    elif period == "last_month":
        first_of_this_month = date(today.year, today.month, 1)
        calc_end = first_of_this_month - timedelta(days=1)
        calc_start = date(calc_end.year, calc_end.month, 1)
    else:
        calc_start = start_date or date(today.year, today.month, 1)
        calc_end = end_date or today

    total_team_working_minutes = 0
    total_team_learning_minutes = 0
    mentors_meeting_target_today = 0
    total_missing_worklogs_count = 0

    mentor_cards = []
    for m in mentors:
        today_w = db.query(DailyWorklog).filter(
            DailyWorklog.mentor_id == m.id,
            DailyWorklog.work_date == today
        ).first()
        today_mins = today_w.total_actual_minutes if today_w else 0
        today_status = today_w.status if today_w else "MISSING"
        today_met = today_w.is_target_achieved if today_w else False
        if today_met:
            mentors_meeting_target_today += 1

        wls = db.query(DailyWorklog).filter(
            DailyWorklog.mentor_id == m.id,
            DailyWorklog.work_date >= calc_start,
            DailyWorklog.work_date <= calc_end
        ).all()
        wl_ids = [w.id for w in wls]

        acts = db.query(WorklogActivity).filter(
            WorklogActivity.worklog_id.in_(wl_ids)
        ).all() if wl_ids else []

        m_working_mins = sum(a.actual_minutes or 0 for a in acts)
        m_learning_mins = sum(
            a.actual_minutes or 0 for a in acts
            if a.category and a.category.activity_group == ActivityGroup.LEARNING
        )

        total_team_working_minutes += m_working_mins
        total_team_learning_minutes += m_learning_mins

        curr = calc_start
        missing_count = 0
        wl_dates = {w.work_date: w for w in wls}
        while curr <= calc_end:
            if curr >= settings.SYSTEM_START_DATE and curr.weekday() != 6:
                w_curr = wl_dates.get(curr)
                if not w_curr or w_curr.status != WorklogStatus.SUBMITTED or w_curr.total_actual_minutes == 0:
                    missing_count += 1
            curr += timedelta(days=1)

        total_missing_worklogs_count += missing_count

        days_met = len([w for w in wls if w.is_target_achieved])
        days_logged = len([w for w in wls if w.status == WorklogStatus.SUBMITTED and w.total_actual_minutes > 0])

        mentor_cards.append({
            "id": m.id,
            "full_name": m.full_name,
            "email": m.email,
            "status": m.status,
            "today_status": today_status,
            "today_minutes": today_mins,
            "today_hours": format_minutes_to_hours(today_mins),
            "today_target_achieved": today_met,
            "period_working_minutes": m_working_mins,
            "period_working_hours": format_minutes_to_hours(m_working_mins),
            "period_learning_minutes": m_learning_mins,
            "period_learning_hours": format_minutes_to_hours(m_learning_mins),
            "missing_worklogs_count": missing_count,
            "days_meeting_target": days_met,
            "days_logged": days_logged
        })

    return {
        "period": period,
        "start_date": calc_start,
        "end_date": calc_end,
        "total_mentors": len(mentors),
        "total_team_working_minutes": total_team_working_minutes,
        "total_team_working_hours": format_minutes_to_hours(total_team_working_minutes),
        "total_team_learning_minutes": total_team_learning_minutes,
        "total_team_learning_hours": format_minutes_to_hours(total_team_learning_minutes),
        "mentors_meeting_target_today": mentors_meeting_target_today,
        "mentors_below_target_today": len(mentors) - mentors_meeting_target_today,
        "total_missing_worklogs_count": total_missing_worklogs_count,
        "mentors": mentor_cards
    }


@router.get("/analytics", response_model=MentorPerformanceOverviewOut)
def get_mentor_performance_overview(
    mentor_id: uuid.UUID = Query(...),
    period: str = Query("month", pattern="^(week|month|last_month|custom)$"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    mentor = check_mentor_access(current_user, mentor_id, db)
    today = date.today()

    # 1. Resolve date boundaries based on period
    if period == "week":
        calc_start = today - timedelta(days=today.weekday())
        calc_end = calc_start + timedelta(days=6)
    elif period == "last_month":
        first_of_this_month = today.replace(day=1)
        calc_end = first_of_this_month - timedelta(days=1)
        calc_start = calc_end.replace(day=1)
    elif period == "custom":
        if not start_date or not end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date and end_date are required for custom date range."
            )
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date cannot be after end_date."
            )
        calc_start = start_date
        calc_end = end_date
    else:  # "month" (default)
        calc_start = today.replace(day=1)
        num_days = calendar.monthrange(today.year, today.month)[1]
        calc_end = today.replace(day=num_days)

    # 2. Fetch all daily worklogs in date range for this mentor
    worklogs = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == mentor.id,
        DailyWorklog.work_date >= calc_start,
        DailyWorklog.work_date <= calc_end
    ).order_by(DailyWorklog.work_date.asc()).all()

    worklog_map = {w.work_date: w for w in worklogs}
    worklog_ids = [w.id for w in worklogs]

    # 3. Fetch all activities in these worklogs
    activities = db.query(WorklogActivity).filter(
        WorklogActivity.worklog_id.in_(worklog_ids)
    ).order_by(WorklogActivity.start_time.asc()).all() if worklog_ids else []

    # 4. Fetch all available categories to ensure comprehensive reporting
    all_categories = db.query(ActivityCategory).order_by(ActivityCategory.name.asc()).all()

    # 5. Summaries
    total_mins = 0
    learning_mins = 0
    mentoring_mins = 0
    invigilation_mins = 0
    admin_mins = 0
    category_mins_map = {c.id: 0 for c in all_categories}

    learning_activities: List[WorklogActivity] = []

    for act in activities:
        m = act.actual_minutes or 0
        total_mins += m
        if act.category_id in category_mins_map:
            category_mins_map[act.category_id] += m
        else:
            category_mins_map[act.category_id] = m

        if act.category:
            grp = act.category.activity_group
            if grp == ActivityGroup.LEARNING:
                learning_mins += m
                learning_activities.append(act)
            elif grp == ActivityGroup.MENTORING:
                mentoring_mins += m
            elif grp == ActivityGroup.INVIGILATION:
                invigilation_mins += m
            elif grp == ActivityGroup.ADMINISTRATIVE:
                admin_mins += m

    # Category distribution
    cat_dist_list: List[CategoryTimeDistributionItem] = []
    for c in all_categories:
        c_mins = category_mins_map.get(c.id, 0)
        pct = round((c_mins / total_mins * 100), 1) if total_mins > 0 else 0.0
        cat_dist_list.append(CategoryTimeDistributionItem(
            category_id=c.id,
            category_name=c.name,
            activity_group=c.activity_group.value,
            total_minutes=c_mins,
            total_hours=format_minutes_to_hours(c_mins),
            percentage=pct
        ))
    cat_dist_list.sort(key=lambda x: x.total_minutes, reverse=True)

    # 6. Working days, Consistency & Exceptions
    qualifying_working_days = 0
    days_with_worklog = 0
    days_meeting_target = 0
    days_below_target = 0
    missing_worklog_days = 0
    exceptions: List[WorklogExceptionItem] = []

    eval_end = min(calc_end, today)
    curr = calc_start
    while curr <= eval_end:
        is_sunday = (curr.weekday() == 6)
        is_eligible = (curr >= settings.SYSTEM_START_DATE) and (not is_sunday)
        if is_eligible:
            qualifying_working_days += 1
            w = worklog_map.get(curr)
            day_name = curr.strftime("%A")
            formatted_date = curr.strftime("%d %b %Y")

            if w and w.status == WorklogStatus.SUBMITTED and w.total_actual_minutes > 0:
                days_with_worklog += 1
                if w.total_actual_minutes >= settings.DAILY_TARGET_MINUTES:
                    days_meeting_target += 1
                else:
                    days_below_target += 1
                    act_count = len(w.activities) if w.activities else 0
                    exceptions.append(WorklogExceptionItem(
                        work_date=curr,
                        formatted_date=formatted_date,
                        day_name=day_name,
                        exception_type="SUB_TARGET",
                        total_minutes=w.total_actual_minutes,
                        total_hours=format_minutes_to_hours(w.total_actual_minutes),
                        activity_count=act_count
                    ))
            elif curr < today:
                missing_worklog_days += 1
                exceptions.append(WorklogExceptionItem(
                    work_date=curr,
                    formatted_date=formatted_date,
                    day_name=day_name,
                    exception_type="MISSING",
                    total_minutes=0,
                    total_hours="0h 00m",
                    activity_count=0
                ))
        curr += timedelta(days=1)

    completion_rate = round((days_with_worklog / qualifying_working_days * 100), 1) if qualifying_working_days > 0 else 100.0

    exceptions.sort(key=lambda x: x.work_date, reverse=True)

    # 7. Learning & Upskilling: Topics Learned & Practical Outcomes
    topics_map = {}
    practical_outcomes_list: List[PracticalOutcomeItem] = []

    for act in learning_activities:
        topic_name = act.task_name.strip()
        act_date = act.worklog.work_date if act.worklog else act.start_time.date()
        act_mins = act.actual_minutes or 0

        if topic_name not in topics_map:
            topics_map[topic_name] = {
                "total_minutes": 0,
                "activity_count": 0,
                "most_recent_date": act_date,
                "outcomes": []
            }
        topics_map[topic_name]["total_minutes"] += act_mins
        topics_map[topic_name]["activity_count"] += 1
        if act_date > topics_map[topic_name]["most_recent_date"]:
            topics_map[topic_name]["most_recent_date"] = act_date

        if act.outcome and act.outcome.strip():
            outcome_clean = act.outcome.strip()
            if outcome_clean not in topics_map[topic_name]["outcomes"]:
                topics_map[topic_name]["outcomes"].append(outcome_clean)
            practical_outcomes_list.append(PracticalOutcomeItem(
                outcome=outcome_clean,
                task_name=topic_name,
                work_date=act_date,
                minutes=act_mins,
                minutes_formatted=format_minutes_to_hours(act_mins)
            ))

    topics_learned: List[TopicLearningItem] = []
    for t_name, t_data in topics_map.items():
        topics_learned.append(TopicLearningItem(
            topic=t_name,
            total_minutes=t_data["total_minutes"],
            total_hours=format_minutes_to_hours(t_data["total_minutes"]),
            activity_count=t_data["activity_count"],
            most_recent_date=t_data["most_recent_date"],
            recorded_outcomes=t_data["outcomes"]
        ))
    topics_learned.sort(key=lambda x: x.total_minutes, reverse=True)
    practical_outcomes_list.sort(key=lambda x: x.work_date, reverse=True)

    # 8. Weekly Learning Trend
    weekly_trend: List[WeeklyLearningTrendItem] = []
    week_cursor = calc_start
    week_idx = 1
    while week_cursor <= calc_end:
        w_start = week_cursor
        w_end = min(week_cursor + timedelta(days=6), calc_end)
        w_label = f"W{week_idx} ({w_start.strftime('%d %b')} - {w_end.strftime('%d %b')})"

        w_acts = [
            a for a in learning_activities
            if (a.worklog and w_start <= a.worklog.work_date <= w_end) or
               (w_start <= a.start_time.date() <= w_end)
        ]
        w_mins = sum(a.actual_minutes or 0 for a in w_acts)
        w_topics = list({a.task_name.strip() for a in w_acts})

        weekly_trend.append(WeeklyLearningTrendItem(
            week_label=w_label,
            start_date=w_start,
            end_date=w_end,
            learning_minutes=w_mins,
            learning_hours=format_minutes_to_hours(w_mins),
            topics=w_topics
        ))
        week_idx += 1
        week_cursor = w_end + timedelta(days=1)

    learning_summary = LearningOverviewSummary(
        total_learning_minutes=learning_mins,
        total_learning_hours=format_minutes_to_hours(learning_mins),
        distinct_topics_count=len(topics_learned),
        learning_activities_count=len(learning_activities),
        practical_outcomes_count=len(practical_outcomes_list)
    )

    return MentorPerformanceOverviewOut(
        mentor_id=mentor.id,
        mentor_name=mentor.full_name,
        mentor_email=mentor.email,
        period=period,
        start_date=calc_start,
        end_date=calc_end,
        total_actual_minutes=total_mins,
        total_actual_hours=format_minutes_to_hours(total_mins),
        learning_minutes=learning_mins,
        learning_hours=format_minutes_to_hours(learning_mins),
        mentoring_minutes=mentoring_mins,
        mentoring_hours=format_minutes_to_hours(mentoring_mins),
        invigilation_minutes=invigilation_mins,
        invigilation_hours=format_minutes_to_hours(invigilation_mins),
        admin_minutes=admin_mins,
        admin_hours=format_minutes_to_hours(admin_mins),
        qualifying_working_days=qualifying_working_days,
        days_with_worklog=days_with_worklog,
        days_meeting_target=days_meeting_target,
        days_below_target=days_below_target,
        missing_worklog_days=missing_worklog_days,
        worklog_completion_rate=completion_rate,
        learning_summary=learning_summary,
        topics_learned=topics_learned,
        practical_outcomes=practical_outcomes_list,
        weekly_learning_trend=weekly_trend,
        category_distribution=cat_dist_list,
        exceptions=exceptions
    )

@router.get("/dashboard", response_model=ManagerDashboardView)
def get_manager_dashboard_view(
    mentor_id: Optional[uuid.UUID] = Query(None),
    selected_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    mentors = get_authorized_mentors(current_user, db)
    if not mentors:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mentors are currently assigned to your account."
        )

    # Determine selected mentor
    if mentor_id:
        mentor = check_mentor_access(current_user, mentor_id, db)
    else:
        mentor = mentors[0]

    # Target date defaults to today
    if not selected_date:
        selected_date = date.today()

    # Fetch daily worklog for the selected date
    worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == mentor.id,
        DailyWorklog.work_date == selected_date
    ).first()

    if not worklog:
        # Auto-create empty draft worklog so manager can view and leave remarks
        worklog = DailyWorklog(
            mentor_id=mentor.id,
            work_date=selected_date,
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

    feedbacks = db.query(ManagerFeedback).filter(
        ManagerFeedback.worklog_id == worklog.id
    ).order_by(ManagerFeedback.created_at.desc()).all()

    kpi = compute_kpi_summary(activities)

    # Generate date strip with accurate status and missing detection
    date_strip = generate_date_strip(mentor.id, selected_date, db)

    worklog_out = DailyWorklogOut.model_validate(worklog)
    worklog_out.activities = [ActivityOut.model_validate(a) for a in activities]
    worklog_out.feedbacks = [FeedbackOut.model_validate(fb) for fb in feedbacks]
    worklog_out.kpi_summary = kpi

    return ManagerDashboardView(
        selected_mentor=UserBrief.model_validate(mentor),
        selected_date=selected_date,
        worklog=worklog_out,
        kpi=kpi,
        date_strip=date_strip
    )

@router.get("/monthly", response_model=List[MonthlyCalendarDay])
def get_manager_monthly_calendar(
    mentor_id: uuid.UUID = Query(...),
    month: Optional[str] = Query(None, description="Month format YYYY-MM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    check_mentor_access(current_user, mentor_id, db)
    if month:
        try:
            parts = month.split("-")
            year = int(parts[0])
            m = int(parts[1])
        except Exception:
            year, m = date.today().year, date.today().month
    else:
        year, m = date.today().year, date.today().month

    return generate_monthly_calendar_days(mentor_id, year, m, db)

@router.post("/worklogs/{worklog_id}/feedback", response_model=FeedbackOut)
def leave_feedback(
    worklog_id: uuid.UUID,
    feedback_in: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    worklog = db.query(DailyWorklog).filter(DailyWorklog.id == worklog_id).first()
    if not worklog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily worklog not found.")

    # Validate mentor is assigned to manager
    check_mentor_access(current_user, worklog.mentor_id, db)

    fb = ManagerFeedback(
        worklog_id=worklog.id,
        manager_id=current_user.id,
        remarks=feedback_in.remarks.strip(),
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return FeedbackOut.model_validate(fb)

@router.post("/feedback", response_model=FeedbackOut)
def leave_direct_feedback(
    feedback_in: ManagerFeedbackDirectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    check_mentor_access(current_user, feedback_in.mentor_id, db)

    worklog = None
    if feedback_in.worklog_id:
        worklog = db.query(DailyWorklog).filter(DailyWorklog.id == feedback_in.worklog_id).first()

    if not worklog:
        worklog = db.query(DailyWorklog).filter(
            DailyWorklog.mentor_id == feedback_in.mentor_id,
            DailyWorklog.work_date == feedback_in.work_date
        ).first()

    if not worklog:
        worklog = DailyWorklog(
            mentor_id=feedback_in.mentor_id,
            work_date=feedback_in.work_date,
            status=WorklogStatus.DRAFT,
            total_actual_minutes=0,
            is_target_achieved=False
        )
        db.add(worklog)
        db.commit()
        db.refresh(worklog)

    fb = ManagerFeedback(
        worklog_id=worklog.id,
        manager_id=current_user.id,
        remarks=feedback_in.remarks.strip(),
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return FeedbackOut.model_validate(fb)

@router.get("/reports/summary")
def get_manager_reports_summary(
    range_type: str = Query("weekly", pattern="^(weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    mentors = get_authorized_mentors(current_user, db)
    mentor_ids = [m.id for m in mentors]
    today = date.today()

    if range_type == "weekly":
        start_date = today - timedelta(days=6) # 7-day window
    else:
        start_date = today.replace(day=1) # Month to date

    # Fetch all worklogs in range
    worklogs = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id.in_(mentor_ids),
        DailyWorklog.work_date >= start_date,
        DailyWorklog.work_date <= today
    ).all()

    worklog_ids = [w.id for w in worklogs]

    # Fetch activities with categories
    activities = db.query(WorklogActivity).filter(
        WorklogActivity.worklog_id.in_(worklog_ids)
    ).all() if worklog_ids else []

    # Aggregations by mentor
    mentor_stats = {}
    for m in mentors:
        mentor_stats[str(m.id)] = {
            "mentor_id": str(m.id),
            "name": m.full_name,
            "email": m.email,
            "days_logged": 0,
            "target_achieved_days": 0,
            "total_minutes": 0,
            "learning_minutes": 0,
            "mentoring_minutes": 0,
            "invigilation_minutes": 0,
            "admin_minutes": 0,
            "completed_tasks": 0,
            "in_progress_tasks": 0
        }

    for w in worklogs:
        key = str(w.mentor_id)
        if key in mentor_stats:
            mentor_stats[key]["days_logged"] += 1
            if w.is_target_achieved:
                mentor_stats[key]["target_achieved_days"] += 1

    for a in activities:
        key = str(a.mentor_id)
        if key in mentor_stats:
            mins = a.actual_minutes or 0
            mentor_stats[key]["total_minutes"] += mins
            if a.status == TaskStatus.COMPLETED:
                mentor_stats[key]["completed_tasks"] += 1
            elif a.status == TaskStatus.IN_PROGRESS:
                mentor_stats[key]["in_progress_tasks"] += 1

            if a.category:
                grp = a.category.activity_group
                if grp == ActivityGroup.LEARNING:
                    mentor_stats[key]["learning_minutes"] += mins
                elif grp == ActivityGroup.MENTORING:
                    mentor_stats[key]["mentoring_minutes"] += mins
                elif grp == ActivityGroup.INVIGILATION:
                    mentor_stats[key]["invigilation_minutes"] += mins
                elif grp == ActivityGroup.ADMINISTRATIVE:
                    mentor_stats[key]["admin_minutes"] += mins

    # Format output
    report_list = []
    for item in mentor_stats.values():
        item["total_hours"] = format_minutes_to_hours(item["total_minutes"])
        item["learning_hours"] = format_minutes_to_hours(item["learning_minutes"])
        item["mentoring_hours"] = format_minutes_to_hours(item["mentoring_minutes"])
        item["invigilation_hours"] = format_minutes_to_hours(item["invigilation_minutes"])
        item["admin_hours"] = format_minutes_to_hours(item["admin_minutes"])
        report_list.append(item)

    return {
        "range_type": range_type,
        "start_date": start_date,
        "end_date": today,
        "total_mentors": len(mentors),
        "mentors_summary": report_list
    }

# =========================================================================
# MENTOR SKILL FINDER
# =========================================================================

SKILL_SYNONYM_GROUPS = [
    {"node", "nodejs", "node.js", "express"},
    {"python", "py"},
    {"react", "reactjs", "react.js"},
    {"git", "github", "version control"},
    {"sql", "postgres", "postgresql", "mysql", "sqlite", "database", "indexing"},
    {"dsa", "data structures", "algorithms", "problem solving"},
    {"oop", "object oriented", "object-oriented"},
    {"gsoc", "google summer of code", "open source"},
    {"redis", "cache", "caching"},
    {"api", "apis", "rest", "restful", "fastapi"},
    {"docker", "container", "containers"},
    {"ai", "llm", "machine learning", "artificial intelligence", "genai"},
    {"streamlit", "dashboard", "data app"},
    {"pandas", "numpy", "data analysis"}
]

STOP_WORDS = {"a", "an", "the", "in", "on", "at", "for", "to", "of", "and", "or", "is", "are", "with", "by"}

def get_search_terms(query: str) -> List[str]:
    clean_q = query.strip().lower()
    if not clean_q:
        return []
    
    terms = [clean_q]
    
    # Clean alphanumeric representation
    alpha_clean = re.sub(r'[^a-z0-9\s]', ' ', clean_q).strip()
    if alpha_clean and alpha_clean != clean_q:
        terms.append(alpha_clean)
        
    # Check synonym groups
    for group in SKILL_SYNONYM_GROUPS:
        # If exact match or token match in group
        if clean_q in group or alpha_clean in group:
            for item in group:
                if item not in terms:
                    terms.append(item)
                    
    # Also individual keywords if multi-word, excluding common stop words
    words = [w for w in re.split(r'[\s\-_/]+', clean_q) if len(w) > 2 and w not in STOP_WORDS]
    for w in words:
        if w not in terms:
            terms.append(w)
            
    return terms

def calculate_non_overlapping_minutes(intervals: List[tuple]) -> int:
    if not intervals:
        return 0
    valid_intervals = []
    for start, end in intervals:
        if start and end and end > start:
            valid_intervals.append((start, end))
    if not valid_intervals:
        return 0
    sorted_intervals = sorted(valid_intervals, key=lambda x: x[0])
    merged = [list(sorted_intervals[0])]
    for current_start, current_end in sorted_intervals[1:]:
        prev_start, prev_end = merged[-1]
        if current_start < prev_end:
            merged[-1][1] = max(prev_end, current_end)
        else:
            merged.append([current_start, current_end])
    total_seconds = sum((end - start).total_seconds() for start, end in merged)
    return int(round(total_seconds / 60))

def classify_activity_evidence(act: WorklogActivity) -> tuple:
    """
    Distinguishes between:
    1. LEARNING: The mentor documented studying a topic.
    2. PRACTICE: The mentor documented exercises, practical work, or project implementation.
    3. TEACHING_EXPERIENCE: The mentor documented teaching, mentoring, or practical work involving the topic.
    4. RELATED: Neutral fallback for general worklog entries.
    """
    cat_name = (act.category.name if act.category else "").lower()
    cat_group = act.category.activity_group if act.category else None
    task_str = (act.task_name or "").strip()
    desc_str = (act.task_description or "").strip()
    out_str = (act.outcome or "").strip()
    full_text = f"{task_str} {desc_str} {out_str}".lower()

    # 1. Teaching / Delivery / Mentoring Experience
    if "online live classes" in cat_name or any(k in full_text for k in ["delivering live", "live session", "live class", "live python session"]):
        return (
            "TEACHING_EXPERIENCE",
            "Teaching/Experience Recorded",
            "Documented live class delivery or instructional session"
        )
    if cat_group in [ActivityGroup.MENTORING, ActivityGroup.INVIGILATION] and "coding practice" not in cat_name and not task_str.lower().startswith("upskilling"):
        return (
            "TEACHING_EXPERIENCE",
            "Teaching/Experience Recorded",
            f"Delivered cohort mentoring, student doubt resolution, or invigilation ({cat_name})"
        )

    # 2. Hands-on Practice / Project Implementation
    practice_indicators = [
        "coding practice", "practice", "practiced", "exercises", "exercise",
        "solved", "questions", "project development", "building", "built",
        "implemented", "implementation", "hands-on", "lab", "pull request",
        "repo", "debugging", "crud"
    ]
    if "coding practice" in cat_name or any(k in full_text for k in practice_indicators):
        return (
            "PRACTICE",
            "Practice Recorded",
            "Documented hands-on coding exercises, problem solving, or project development"
        )

    # 3. Learning / Upskilling / Self-Study
    learning_indicators = [
        "upskilling", "learned", "learning", "studied", "study",
        "fundamentals", "concepts", "concept", "tutorial", "course",
        "architecture", "reading", "theory", "introduction", "overview"
    ]
    if cat_group == ActivityGroup.LEARNING or any(k in full_text for k in learning_indicators):
        return (
            "LEARNING",
            "Learning Recorded",
            "Documented self-study, tutorial completion, and concept learning"
        )

    # 4. Neutral Fallback
    return (
        "RELATED",
        "Related Activity Recorded",
        "Worklog entry mentions relevant keywords under general activities"
    )

def match_activity(act: WorklogActivity, search_terms: List[str]) -> Optional[str]:
    task_str = (act.task_name or "").lower()
    desc_str = (act.task_description or "").lower()
    out_str = (act.outcome or "").lower()
    rem_str = (act.remarks or "").lower()
    cat_str = (act.category.name if act.category else "").lower()

    combined = f"{task_str} {desc_str} {out_str} {rem_str} {cat_str}"
    combined_alpha = re.sub(r'[^a-z0-9\s]', ' ', combined)

    for term in search_terms:
        term_lower = term.lower()
        t_alpha = re.sub(r'[^a-z0-9\s]', ' ', term_lower).strip()
        pattern = r'\b' + re.escape(term_lower) + r'\b'

        if re.search(pattern, combined):
            return term
        if t_alpha and re.search(r'\b' + re.escape(t_alpha) + r'\b', combined_alpha):
            return term
        if len(term_lower) >= 4 and term_lower in combined:
            return term
    return None

@router.get("/skill-finder", response_model=SkillFinderSearchResponse)
def search_mentor_skills(
    q: str = Query(..., min_length=1, description="Skill or topic to search for"),
    evidence_type: Optional[str] = Query("all", description="Filter by evidence type (all, LEARNING, PRACTICE, TEACHING_EXPERIENCE, RELATED)"),
    date_range: Optional[str] = Query("all", description="Date range: all, 7d, 30d, custom"),
    start_date: Optional[date] = Query(None, description="Custom start date (inclusive)"),
    end_date: Optional[date] = Query(None, description="Custom end date (inclusive)"),
    mentor_id: Optional[uuid.UUID] = Query(None, description="Filter by specific assigned mentor"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    clean_query = q.strip()
    if not clean_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid skill or topic query."
        )

    search_terms = get_search_terms(clean_query)

    # 1. Enforce privacy & permissions: Only authorized mentors for this manager
    authorized_mentors = get_authorized_mentors(current_user, db)
    if mentor_id:
        # Validate that requested mentor belongs to this manager
        mentor = check_mentor_access(current_user, mentor_id, db)
        target_mentors = [mentor]
    else:
        target_mentors = authorized_mentors

    if not target_mentors:
        return SkillFinderSearchResponse(
            query=clean_query,
            search_terms_used=search_terms,
            total_matching_mentors=0,
            total_matching_activities=0,
            total_recorded_minutes=0,
            total_recorded_hours="0h 00m",
            evidence_counts={"LEARNING": 0, "PRACTICE": 0, "TEACHING_EXPERIENCE": 0, "RELATED": 0},
            mentors=[]
        )

    # 2. Date range calculation
    filter_start = None
    filter_end = None
    today = date.today()

    if date_range == "7d":
        filter_start = today - timedelta(days=7)
        filter_end = today
    elif date_range == "30d":
        filter_start = today - timedelta(days=30)
        filter_end = today
    elif date_range == "custom":
        filter_start = start_date
        filter_end = end_date

    matching_mentors_list: List[SkillFinderMentorResult] = []
    global_evidence_counts = {"LEARNING": 0, "PRACTICE": 0, "TEACHING_EXPERIENCE": 0, "RELATED": 0}

    for mentor in target_mentors:
        # Query activities for this mentor joined to DailyWorklog
        act_query = db.query(WorklogActivity).join(DailyWorklog).filter(
            WorklogActivity.mentor_id == mentor.id
        )

        if filter_start:
            act_query = act_query.filter(DailyWorklog.work_date >= filter_start)
        if filter_end:
            act_query = act_query.filter(DailyWorklog.work_date <= filter_end)

        # Order by most recent work date, then start time
        activities = act_query.order_by(
            DailyWorklog.work_date.desc(),
            WorklogActivity.start_time.desc()
        ).all()

        mentor_matched_activities: List[SkillFinderActivityItem] = []
        activity_intervals = []

        for act in activities:
            matched_term = match_activity(act, search_terms)
            if not matched_term:
                continue

            etype, elabel, enote = classify_activity_evidence(act)

            # Apply evidence type filter if specified
            if evidence_type and evidence_type != "all" and etype != evidence_type:
                continue

            global_evidence_counts[etype] = global_evidence_counts.get(etype, 0) + 1
            activity_intervals.append((act.start_time, act.end_time))

            work_d = act.worklog.work_date if act.worklog else act.start_time.date()
            start_fmt = act.start_time.strftime("%H:%M") if act.start_time else "--:--"
            end_fmt = act.end_time.strftime("%H:%M") if act.end_time else "--:--"
            dur_mins = act.actual_minutes or 0

            mentor_matched_activities.append(SkillFinderActivityItem(
                id=act.id,
                worklog_id=act.worklog_id,
                work_date=work_d,
                formatted_date=work_d.strftime("%d %b %Y"),
                task_name=act.task_name,
                task_description=act.task_description,
                outcome=act.outcome,
                remarks=act.remarks,
                category_name=act.category.name if act.category else "General",
                category_group=act.category.activity_group.value if act.category else "GENERAL",
                start_time=act.start_time,
                end_time=act.end_time,
                start_time_formatted=start_fmt,
                end_time_formatted=end_fmt,
                actual_minutes=dur_mins,
                duration_formatted=format_minutes_to_hours(dur_mins),
                evidence_type=etype,
                evidence_label=elabel,
                evidence_note=enote,
                matched_term=matched_term
            ))

        if mentor_matched_activities:
            total_relevant_mins = calculate_non_overlapping_minutes(activity_intervals)
            most_recent_d = mentor_matched_activities[0].work_date
            unique_evidence = list(dict.fromkeys(a.evidence_type for a in mentor_matched_activities))

            matching_mentors_list.append(SkillFinderMentorResult(
                mentor_id=mentor.id,
                mentor_name=mentor.full_name,
                mentor_email=mentor.email,
                manager_name=mentor.manager.full_name if mentor.manager else None,
                total_matching_activities=len(mentor_matched_activities),
                total_relevant_minutes=total_relevant_mins,
                total_relevant_hours=format_minutes_to_hours(total_relevant_mins),
                most_recent_activity_date=most_recent_d,
                most_recent_activity_formatted=most_recent_d.strftime("%d %b %Y"),
                evidence_types_present=unique_evidence,
                activities=mentor_matched_activities
            ))

    # Sort matching mentors by most recent activity date descending
    matching_mentors_list.sort(key=lambda m: m.most_recent_activity_date or date.min, reverse=True)

    total_activities_count = sum(len(m.activities) for m in matching_mentors_list)
    total_minutes_all = sum(m.total_relevant_minutes for m in matching_mentors_list)

    return SkillFinderSearchResponse(
        query=clean_query,
        search_terms_used=search_terms,
        total_matching_mentors=len(matching_mentors_list),
        total_matching_activities=total_activities_count,
        total_recorded_minutes=total_minutes_all,
        total_recorded_hours=format_minutes_to_hours(total_minutes_all),
        evidence_counts=global_evidence_counts,
        mentors=matching_mentors_list
    )

