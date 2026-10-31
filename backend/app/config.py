import os
from datetime import date

class Settings:
    _raw_db = os.getenv("DATABASE_URL", "sqlite:///./niat_worklog.db")
    if _raw_db.startswith("postgres://"):
        DATABASE_URL: str = _raw_db.replace("postgres://", "postgresql+psycopg://", 1)
    elif _raw_db.startswith("postgresql://") and not _raw_db.startswith("postgresql+psycopg://"):
        DATABASE_URL: str = _raw_db.replace("postgresql://", "postgresql+psycopg://", 1)
    else:
        DATABASE_URL: str = _raw_db

    JWT_SECRET: str = os.getenv("JWT_SECRET", "niat-super-secure-jwt-secret-key-change-in-production-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))
    DAILY_TARGET_MINUTES: int = 360  # 6 hours threshold
    EDITING_DEADLINE_DAYS: int = int(os.getenv("EDITING_DEADLINE_DAYS", "3"))
    SYSTEM_START_DATE: date = date(2026, 10, 11)  # Worklogs prior to 11 Oct 2026 were in Google Sheets

settings = Settings()
