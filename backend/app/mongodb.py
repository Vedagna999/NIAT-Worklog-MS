import os
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://vedmonsterup_db_user:ciFEB5uQg7m3AZbT@cluster0.dpqokep.mongodb.net/niat_worklog?retryWrites=true&w=majority&appName=Cluster0"
)

_client: Optional[MongoClient] = None

def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    return _client

def get_mongo_db() -> Database:
    client = get_mongo_client()
    return client.get_default_database("niat_worklog")

def check_mongo_health() -> dict:
    try:
        client = get_mongo_client()
        client.admin.command("ping")
        db = get_mongo_db()
        return {
            "status": "connected",
            "cluster": "cluster0.dpqokep.mongodb.net",
            "database": db.name,
            "counts": {
                "users": db.users.count_documents({}),
                "daily_worklogs": db.daily_worklogs.count_documents({}),
                "worklog_activities": db.worklog_activities.count_documents({}),
                "mentor_skills": db.mentor_skills.count_documents({}),
                "skill_growth_logs": db.skill_growth_logs.count_documents({}),
                "activity_categories": db.activity_categories.count_documents({}),
                "manager_feedback": db.manager_feedback.count_documents({})
            }
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e)
        }
