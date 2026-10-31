from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole, UserStatus
from app.schemas import UserBrief
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/managers", response_model=List[UserBrief])
def get_all_managers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    managers = db.query(User).filter(
        User.role == UserRole.MANAGER,
        User.status == UserStatus.ACTIVE
    ).order_by(User.full_name).all()
    return managers
