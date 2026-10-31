import uuid
from datetime import date, datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_serializer
from app.models import UserRole, UserStatus, ActivityGroup, WorklogStatus, TaskPriority, TaskStatus, SkillCategoryType, SkillStatus

# User Schemas
class UserBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    manager_id: Optional[uuid.UUID] = None
    status: UserStatus

    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.MENTOR
    manager_id: Optional[uuid.UUID] = None
    status: UserStatus = UserStatus.ACTIVE

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    manager_id: Optional[uuid.UUID] = None
    status: Optional[UserStatus] = None

class UserOut(UserBrief):
    manager: Optional[UserBrief] = None
    created_at: datetime

    model_config = {"from_attributes": True}

# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserBrief

class TokenPayload(BaseModel):
    sub: str
    role: UserRole
    exp: int

# Activity Category Schemas
class CategoryBase(BaseModel):
    name: str
    activity_group: ActivityGroup
    qualifies_for_six_hours: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}

# Worklog Activity Schemas
class ActivityBase(BaseModel):
    category_id: uuid.UUID
    task_name: str
    task_description: Optional[str] = None
    outcome: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.COMPLETED
    planned_minutes: Optional[int] = None
    start_time: datetime
    end_time: datetime
    actual_minutes: Optional[int] = None # Can be auto-computed
    remarks: Optional[str] = None
    dependencies: Optional[str] = None
    deviations: Optional[str] = None

class ActivityCreate(ActivityBase):
    work_date: Optional[date] = None # If provided and no worklog exists yet for date, can auto-create

class ActivityUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    task_name: Optional[str] = None
    task_description: Optional[str] = None
    outcome: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    planned_minutes: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    actual_minutes: Optional[int] = None
    remarks: Optional[str] = None
    dependencies: Optional[str] = None
    deviations: Optional[str] = None

class ActivityOut(BaseModel):
    id: uuid.UUID
    worklog_id: uuid.UUID
    mentor_id: uuid.UUID
    category_id: uuid.UUID
    category: Optional[CategoryOut] = None
    task_name: str
    task_description: Optional[str] = None
    outcome: Optional[str] = None
    priority: TaskPriority
    status: TaskStatus
    planned_minutes: Optional[int] = None
    start_time: datetime
    end_time: datetime
    actual_minutes: int
    remarks: Optional[str] = None
    dependencies: Optional[str] = None
    deviations: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

# Feedback Schemas
class FeedbackCreate(BaseModel):
    remarks: str

class ManagerFeedbackDirectCreate(BaseModel):
    mentor_id: uuid.UUID
    work_date: date
    remarks: str
    worklog_id: Optional[uuid.UUID] = None

class FeedbackOut(BaseModel):
    id: uuid.UUID
    worklog_id: uuid.UUID
    manager_id: uuid.UUID
    manager: Optional[UserBrief] = None
    remarks: str
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

# Daily Worklog Schemas
class DailyWorklogBase(BaseModel):
    work_date: date

class DailyWorklogCreate(DailyWorklogBase):
    pass

class DailyWorklogStatusUpdate(BaseModel):
    status: WorklogStatus

class KpiSummary(BaseModel):
    total_minutes: int = 0
    total_formatted: str = "0h 00m"
    completed_count: int = 0
    in_progress_count: int = 0
    blocked_count: int = 0
    learning_minutes: int = 0
    learning_formatted: str = "0h 00m"
    is_target_achieved: bool = False
    qualifying_minutes: int = 0

class DatePillSummary(BaseModel):
    work_date: date
    status: Optional[WorklogStatus] = None
    total_minutes: int = 0
    is_target_achieved: bool = False
    activity_count: int = 0
    learning_minutes: int = 0
    is_missing: bool = False
    is_not_available: bool = False

class DailyWorklogOut(BaseModel):
    id: uuid.UUID
    mentor_id: uuid.UUID
    mentor: Optional[UserBrief] = None
    work_date: date
    status: WorklogStatus
    total_actual_minutes: int
    is_target_achieved: bool
    submission_time: Optional[datetime] = None
    activities: List[ActivityOut] = []
    feedbacks: List[FeedbackOut] = []
    kpi_summary: Optional[KpiSummary] = None
    date_strip: Optional[List[DatePillSummary]] = None

    model_config = {"from_attributes": True}

    @field_serializer("submission_time")
    def serialize_submission_time(self, dt: Optional[datetime], _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class MissingWorklogItem(BaseModel):
    work_date: date
    formatted_date: str
    day_name: str
    days_ago: int

class MonthlyCalendarDay(BaseModel):
    work_date: date
    day_number: int
    is_current_month: bool
    is_today: bool
    is_future: bool
    is_weekend: bool
    status: Optional[WorklogStatus] = None
    total_minutes: int = 0
    total_formatted: str = "0h 00m"
    is_target_achieved: bool = False
    is_missing: bool = False
    is_not_available: bool = False
    activity_count: int = 0

class MentorRosterItem(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    status: UserStatus
    today_status: Optional[WorklogStatus] = None
    today_minutes: int = 0
    today_target_achieved: bool = False

class ManagerDashboardView(BaseModel):
    selected_mentor: UserBrief
    selected_date: date
    worklog: Optional[DailyWorklogOut] = None
    kpi: KpiSummary
    date_strip: List[DatePillSummary]

# Mentor Performance & Learning Analytics Schemas
class TopicLearningItem(BaseModel):
    topic: str
    total_minutes: int
    total_hours: str
    activity_count: int
    most_recent_date: date
    recorded_outcomes: List[str] = []

class PracticalOutcomeItem(BaseModel):
    outcome: str
    task_name: str
    work_date: date
    minutes: int
    minutes_formatted: str

class WeeklyLearningTrendItem(BaseModel):
    week_label: str
    start_date: date
    end_date: date
    learning_minutes: int
    learning_hours: str
    topics: List[str] = []

class CategoryTimeDistributionItem(BaseModel):
    category_id: uuid.UUID
    category_name: str
    activity_group: str
    total_minutes: int
    total_hours: str
    percentage: float

class WorklogExceptionItem(BaseModel):
    work_date: date
    formatted_date: str
    day_name: str
    exception_type: str  # "MISSING" or "SUB_TARGET"
    total_minutes: int
    total_hours: str
    activity_count: int

class LearningOverviewSummary(BaseModel):
    total_learning_minutes: int
    total_learning_hours: str
    distinct_topics_count: int
    learning_activities_count: int
    practical_outcomes_count: int

class MentorPerformanceOverviewOut(BaseModel):
    mentor_id: uuid.UUID
    mentor_name: str
    mentor_email: str
    period: str
    start_date: date
    end_date: date
    
    # Section B: Summary metrics
    total_actual_minutes: int
    total_actual_hours: str
    learning_minutes: int
    learning_hours: str
    mentoring_minutes: int
    mentoring_hours: str
    invigilation_minutes: int
    invigilation_hours: str
    admin_minutes: int
    admin_hours: str
    
    qualifying_working_days: int
    days_with_worklog: int
    days_meeting_target: int
    days_below_target: int
    missing_worklog_days: int
    worklog_completion_rate: float
    
    # Section C: Learning & Upskilling
    learning_summary: LearningOverviewSummary
    topics_learned: List[TopicLearningItem] = []
    practical_outcomes: List[PracticalOutcomeItem] = []
    weekly_learning_trend: List[WeeklyLearningTrendItem] = []
    
    # Section D: Category-wise Distribution
    category_distribution: List[CategoryTimeDistributionItem] = []
    
    # Section E: Consistency & Exceptions
    exceptions: List[WorklogExceptionItem] = []

# Section: Mentor Skill Finder Schemas
class SkillFinderActivityItem(BaseModel):
    id: uuid.UUID
    worklog_id: uuid.UUID
    work_date: date
    formatted_date: str
    task_name: str
    task_description: Optional[str] = None
    outcome: Optional[str] = None
    remarks: Optional[str] = None
    category_name: str
    category_group: str
    start_time: datetime
    end_time: datetime
    start_time_formatted: str
    end_time_formatted: str
    actual_minutes: int
    duration_formatted: str
    evidence_type: str  # "LEARNING" | "PRACTICE" | "TEACHING_EXPERIENCE" | "RELATED"
    evidence_label: str # "Learning Recorded" | "Practice Recorded" | "Teaching/Experience Recorded" | "Related Activity Recorded"
    evidence_note: str
    matched_term: str

class SkillFinderMentorResult(BaseModel):
    mentor_id: uuid.UUID
    mentor_name: str
    mentor_email: str
    manager_name: Optional[str] = None
    total_matching_activities: int
    total_relevant_minutes: int
    total_relevant_hours: str
    most_recent_activity_date: Optional[date] = None
    most_recent_activity_formatted: Optional[str] = None
    evidence_types_present: List[str] = []
    activities: List[SkillFinderActivityItem] = []

class SkillFinderSearchResponse(BaseModel):
    query: str
    search_terms_used: List[str] = []
    total_matching_mentors: int
    total_matching_activities: int
    total_recorded_minutes: int
    total_recorded_hours: str
    evidence_counts: dict = {}
    mentors: List[SkillFinderMentorResult] = []

# ============================================================================
# Mentor Skills & Growth Platform Schemas
# ============================================================================

class MentorSkillBase(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=100)
    category_type: SkillCategoryType = SkillCategoryType.TECHNICAL
    confidence_rating: float = Field(..., ge=0.5, le=5.0)
    status: SkillStatus = SkillStatus.FAMILIAR
    notes: Optional[str] = None

class MentorSkillCreate(MentorSkillBase):
    pass

class MentorSkillUpdate(BaseModel):
    confidence_rating: Optional[float] = Field(None, ge=0.5, le=5.0)
    status: Optional[SkillStatus] = None
    notes: Optional[str] = None
    category_type: Optional[SkillCategoryType] = None

class SkillGrowthLogOut(BaseModel):
    id: uuid.UUID
    mentor_skill_id: uuid.UUID
    skill_name: Optional[str] = None
    mentor_id: uuid.UUID
    worklog_id: Optional[uuid.UUID] = None
    activity_id: Optional[uuid.UUID] = None
    log_date: date
    formatted_date: Optional[str] = None
    previous_rating: Optional[float] = None
    new_rating: float
    status: Optional[SkillStatus] = None
    notes: Optional[str] = None
    activity_task_name: Optional[str] = None
    activity_outcome: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class MentorSkillOut(BaseModel):
    id: uuid.UUID
    mentor_id: uuid.UUID
    skill_name: str
    category_type: SkillCategoryType
    confidence_rating: float
    status: SkillStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_updated_formatted: Optional[str] = None
    growth_count: int = 0
    growth_logs: List[SkillGrowthLogOut] = []

    model_config = {"from_attributes": True}

class SkillUpskillRequest(BaseModel):
    skill_id: Optional[uuid.UUID] = None
    skill_name: Optional[str] = None
    category_type: SkillCategoryType = SkillCategoryType.TECHNICAL
    confidence_rating: float = Field(..., ge=0.5, le=5.0)
    status: Optional[SkillStatus] = None
    worklog_id: Optional[uuid.UUID] = None
    activity_id: Optional[uuid.UUID] = None
    log_date: Optional[date] = None
    notes: Optional[str] = None

class MentorSkillsProfileSummary(BaseModel):
    mentor_id: uuid.UUID
    mentor_name: str
    mentor_email: str
    is_profile_completed: bool = False
    total_skills: int = 0
    technical_skills_count: int = 0
    non_technical_skills_count: int = 0
    currently_learning_count: int = 0
    familiar_count: int = 0
    proficient_count: int = 0
    average_confidence: float = 0.0
    skills: List[MentorSkillOut] = []

class SkillGrowthTimelinePoint(BaseModel):
    date: date
    formatted_date: str
    rating: float
    previous_rating: Optional[float] = None
    rating_change: float = 0.0
    notes: Optional[str] = None
    activity_id: Optional[uuid.UUID] = None
    worklog_id: Optional[uuid.UUID] = None

class SkillGrowthTimeline(BaseModel):
    skill_name: str
    category_type: SkillCategoryType
    current_rating: float
    initial_rating: float
    total_growth: float
    history: List[SkillGrowthTimelinePoint] = []

class RecentlyUpskilledItem(BaseModel):
    id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: str
    category_type: SkillCategoryType
    date: date
    formatted_date: str
    previous_rating: Optional[float] = None
    current_rating: float
    status: Optional[SkillStatus] = None
    notes: Optional[str] = None
    worklog_id: Optional[uuid.UUID] = None
    activity_id: Optional[uuid.UUID] = None
    activity_task_name: Optional[str] = None

class ManagerMentorSkillsView(BaseModel):
    mentor_id: uuid.UUID
    mentor_name: str
    mentor_email: str
    manager_name: Optional[str] = None
    summary: MentorSkillsProfileSummary
    skills: List[MentorSkillOut] = []
    recently_upskilled: List[RecentlyUpskilledItem] = []
    growth_timelines: List[SkillGrowthTimeline] = []



