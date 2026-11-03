import os
import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "")

_client: Optional[MongoClient] = None

def get_mongo_client() -> Optional[MongoClient]:
    global _client
    if not MONGODB_URI:
        logger.warning("MONGODB_URI environment variable is not set.")
        return None
    if _client is None:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    return _client

def get_mongo_db() -> Optional[Database]:
    client = get_mongo_client()
    if client is None:
        return None
    return client.get_default_database("niat_worklog")

def check_mongo_health() -> dict:
    if not MONGODB_URI:
        return {
            "status": "unconfigured",
            "message": "MONGODB_URI environment variable is not set."
        }
    try:
        client = get_mongo_client()
        if client is None:
            return {"status": "unconfigured", "message": "MongoClient could not be initialized."}
        client.admin.command("ping")
        db = get_mongo_db()
        return {
            "status": "connected",
            "database": db.name if db is not None else "niat_worklog",
            "counts": {
                "users": db.users.count_documents({}),
                "daily_worklogs": db.daily_worklogs.count_documents({}),
                "worklog_activities": db.worklog_activities.count_documents({}),
                "mentor_skills": db.mentor_skills.count_documents({}),
                "skill_growth_logs": db.skill_growth_logs.count_documents({}),
                "activity_categories": db.activity_categories.count_documents({}),
                "manager_feedback": db.manager_feedback.count_documents({})
            } if db is not None else {}
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e)
        }
