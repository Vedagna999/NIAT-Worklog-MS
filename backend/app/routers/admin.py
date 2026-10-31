import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole, UserStatus, DailyWorklog, WorklogStatus
from app.schemas import UserOut, UserCreate, UserUpdate
from app.auth import require_role, hash_password
from app.utils import recalculate_worklog_totals

router = APIRouter(prefix="/api/admin", tags=["Administrator"])

@router.get("/users", response_model=List[UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    users = db.query(User).order_by(User.role, User.full_name).all()
    return users

@router.post("/users", response_model=UserOut)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user_in.email}' already exists."
        )

    if user_in.manager_id:
        mgr = db.query(User).filter(User.id == user_in.manager_id, User.role == UserRole.MANAGER).first()
        if not mgr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned manager ID is not a valid MANAGER user."
            )

    new_user = User(
        full_name=user_in.full_name.strip(),
        email=user_in.email.lower().strip(),
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        manager_id=user_in.manager_id,
        status=user_in.status
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user_update.email is not None:
        email_clean = user_update.email.lower().strip()
        existing = db.query(User).filter(User.email == email_clean, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already used by another user.")
        user.email = email_clean

    if user_update.full_name is not None:
        user.full_name = user_update.full_name.strip()

    if user_update.password is not None and user_update.password.strip():
        user.password_hash = hash_password(user_update.password.strip())

    if user_update.role is not None:
        user.role = user_update.role

    if user_update.status is not None:
        user.status = user_update.status

    if user_update.manager_id is not None:
        if user_update.manager_id:
            mgr = db.query(User).filter(User.id == user_update.manager_id, User.role == UserRole.MANAGER).first()
            if not mgr:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned manager must be a MANAGER user.")
            user.manager_id = user_update.manager_id
        else:
            user.manager_id = None

    db.commit()
    db.refresh(user)
    return user

@router.post("/worklogs/{worklog_id}/reopen")
def reopen_locked_worklog(
    worklog_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    worklog = db.query(DailyWorklog).filter(DailyWorklog.id == worklog_id).first()
    if not worklog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worklog not found.")

    worklog.status = WorklogStatus.DRAFT
    db.commit()
    db.refresh(worklog)

    return {
        "message": f"Worklog for {worklog.work_date} reopened successfully as DRAFT.",
        "worklog_id": str(worklog.id),
        "status": worklog.status.value
    }
