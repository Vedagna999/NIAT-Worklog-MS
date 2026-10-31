import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Date,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    Text,
    CheckConstraint,
    UniqueConstraint,
    Index,
    Float
)
from sqlalchemy.orm import relationship
from app.database import Base, GUID

class UserRole(str, enum.Enum):
    MENTOR = "MENTOR"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"

class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class ActivityGroup(str, enum.Enum):
    LEARNING = "LEARNING"
    MENTORING = "MENTORING"
    INVIGILATION = "INVIGILATION"
    ADMINISTRATIVE = "ADMINISTRATIVE"

class WorklogStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    LOCKED = "LOCKED"

class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class TaskStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"

class SkillCategoryType(str, enum.Enum):
    TECHNICAL = "TECHNICAL"
    NON_TECHNICAL = "NON_TECHNICAL"

class SkillStatus(str, enum.Enum):
    CURRENTLY_LEARNING = "CURRENTLY_LEARNING"
    FAMILIAR = "FAMILIAR"
    PROFICIENT = "PROFICIENT"

class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name="user_role"), nullable=False, default=UserRole.MENTOR, index=True)
    manager_id = Column(GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(SQLEnum(UserStatus, name="user_status"), nullable=False, default=UserStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Self-referential relationship
    manager = relationship("User", remote_side=[id], backref="mentors")
    
    # Relationships
    worklogs = relationship("DailyWorklog", back_populates="mentor", cascade="all, delete-orphan")
    activities = relationship("WorklogActivity", back_populates="mentor", cascade="all, delete-orphan")
    feedbacks = relationship("ManagerFeedback", back_populates="manager", cascade="all, delete-orphan")
    skills = relationship("MentorSkill", back_populates="mentor", cascade="all, delete-orphan", order_by="MentorSkill.skill_name")
    skill_growth_logs = relationship("SkillGrowthLog", back_populates="mentor", cascade="all, delete-orphan", order_by="SkillGrowthLog.log_date.desc()")

class ActivityCategory(Base):
    __tablename__ = "activity_categories"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    activity_group = Column(SQLEnum(ActivityGroup, name="activity_group_type"), nullable=False, index=True)
    qualifies_for_six_hours = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    activities = relationship("WorklogActivity", back_populates="category")

class DailyWorklog(Base):
    __tablename__ = "daily_worklogs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    mentor_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(Date, nullable=False, index=True)
    status = Column(SQLEnum(WorklogStatus, name="worklog_status"), nullable=False, default=WorklogStatus.DRAFT, index=True)
    total_actual_minutes = Column(Integer, nullable=False, default=0)
    is_target_achieved = Column(Boolean, nullable=False, default=False)
    submission_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("mentor_id", "work_date", name="uq_mentor_workdate"),
        Index("idx_mentor_workdate", "mentor_id", "work_date"),
    )

    # Relationships
    mentor = relationship("User", back_populates="worklogs")
    activities = relationship("WorklogActivity", back_populates="worklog", cascade="all, delete-orphan", order_by="WorklogActivity.start_time")
    feedbacks = relationship("ManagerFeedback", back_populates="worklog", cascade="all, delete-orphan", order_by="ManagerFeedback.created_at.desc()")

class WorklogActivity(Base):
    __tablename__ = "worklog_activities"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    worklog_id = Column(GUID, ForeignKey("daily_worklogs.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(GUID, ForeignKey("activity_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    task_name = Column(String(255), nullable=False)
    task_description = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    priority = Column(SQLEnum(TaskPriority, name="task_priority"), nullable=False, default=TaskPriority.MEDIUM)
    status = Column(SQLEnum(TaskStatus, name="task_status"), nullable=False, default=TaskStatus.COMPLETED)
    planned_minutes = Column(Integer, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    actual_minutes = Column(Integer, nullable=False)
    remarks = Column(Text, nullable=True)
    dependencies = Column(Text, nullable=True)
    deviations = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="chk_end_after_start"),
        CheckConstraint("actual_minutes > 0", name="chk_positive_actual_minutes"),
        Index("idx_activities_mentor_timerange", "mentor_id", "start_time", "end_time"),
    )

    # Relationships
    worklog = relationship("DailyWorklog", back_populates="activities")
    mentor = relationship("User", back_populates="activities")
    category = relationship("ActivityCategory", back_populates="activities")

class ManagerFeedback(Base):
    __tablename__ = "manager_feedback"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    worklog_id = Column(GUID, ForeignKey("daily_worklogs.id", ondelete="CASCADE"), nullable=False, index=True)
    manager_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    remarks = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    worklog = relationship("DailyWorklog", back_populates="feedbacks")
    manager = relationship("User", back_populates="feedbacks")

class MentorSkill(Base):
    __tablename__ = "mentor_skills"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    mentor_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False, index=True)
    category_type = Column(SQLEnum(SkillCategoryType, name="skill_category_type"), nullable=False, default=SkillCategoryType.TECHNICAL)
    confidence_rating = Column(Float, nullable=False, default=1.0)
    status = Column(SQLEnum(SkillStatus, name="skill_status"), nullable=False, default=SkillStatus.FAMILIAR)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("mentor_id", "skill_name", name="uq_mentor_skill_name"),
        CheckConstraint("confidence_rating >= 0.5 AND confidence_rating <= 5.0", name="chk_skill_rating_range"),
        Index("idx_mentor_skills", "mentor_id", "skill_name"),
    )

    # Relationships
    mentor = relationship("User", back_populates="skills")
    growth_logs = relationship(
        "SkillGrowthLog",
        back_populates="skill",
        cascade="all, delete-orphan",
        order_by="SkillGrowthLog.log_date.desc(), SkillGrowthLog.created_at.desc()"
    )

class SkillGrowthLog(Base):
    __tablename__ = "skill_growth_logs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    mentor_skill_id = Column(GUID, ForeignKey("mentor_skills.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    worklog_id = Column(GUID, ForeignKey("daily_worklogs.id", ondelete="SET NULL"), nullable=True, index=True)
    activity_id = Column(GUID, ForeignKey("worklog_activities.id", ondelete="SET NULL"), nullable=True, index=True)
    previous_rating = Column(Float, nullable=True)
    new_rating = Column(Float, nullable=False)
    status = Column(SQLEnum(SkillStatus, name="skill_growth_status"), nullable=True)
    log_date = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    skill = relationship("MentorSkill", back_populates="growth_logs")
    mentor = relationship("User", back_populates="skill_growth_logs")
    worklog = relationship("DailyWorklog")
    activity = relationship("WorklogActivity")

