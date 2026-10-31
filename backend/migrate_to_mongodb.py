import os
import sys
from datetime import datetime, date, time
import uuid
import pymongo
from pymongo import MongoClient

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import (
    User,
    ActivityCategory,
    DailyWorklog,
    WorklogActivity,
    ManagerFeedback,
    MentorSkill,
    SkillGrowthLog
)

MONGO_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://vedmonsterup_db_user:ciFEB5uQg7m3AZbT@cluster0.dpqokep.mongodb.net/niat_worklog?retryWrites=true&w=majority&appName=Cluster0"
)

def format_val(val):
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val

def migrate():
    print(f"Connecting to MongoDB Atlas...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db = client.get_default_database("niat_worklog")
    
    # Ping
    client.admin.command("ping")
    print("MongoDB Atlas Connected successfully to database: niat_worklog!")

    sqlite_db = SessionLocal()

    try:
        # 1. Users
        users = sqlite_db.query(User).all()
        print(f"Migrating {len(users)} users to MongoDB...")
        db.users.drop()
        user_docs = []
        for u in users:
            doc = {
                "_id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "password_hash": u.password_hash,
                "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                "manager_id": str(u.manager_id) if u.manager_id else None,
                "status": u.status.value if hasattr(u.status, "value") else str(u.status),
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "updated_at": u.updated_at.isoformat() if u.updated_at else None,
            }
            user_docs.append(doc)
        if user_docs:
            db.users.insert_many(user_docs)
            db.users.create_index([("email", pymongo.ASCENDING)], unique=True)
            db.users.create_index([("role", pymongo.ASCENDING)])
            db.users.create_index([("manager_id", pymongo.ASCENDING)])
        print(f"Inserted {len(user_docs)} users into MongoDB.")

        # 2. Activity Categories
        categories = sqlite_db.query(ActivityCategory).all()
        print(f"Migrating {len(categories)} categories to MongoDB...")
        db.activity_categories.drop()
        cat_docs = []
        for c in categories:
            doc = {
                "_id": str(c.id),
                "name": c.name,
                "activity_group": c.activity_group.value if hasattr(c.activity_group, "value") else str(c.activity_group),
                "qualifies_for_six_hours": c.qualifies_for_six_hours,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            cat_docs.append(doc)
        if cat_docs:
            db.activity_categories.insert_many(cat_docs)
            db.activity_categories.create_index([("name", pymongo.ASCENDING)], unique=True)
        print(f"Inserted {len(cat_docs)} categories into MongoDB.")

        # 3. Daily Worklogs
        worklogs = sqlite_db.query(DailyWorklog).all()
        print(f"Migrating {len(worklogs)} daily worklogs to MongoDB...")
        db.daily_worklogs.drop()
        wlog_docs = []
        for w in worklogs:
            doc = {
                "_id": str(w.id),
                "mentor_id": str(w.mentor_id),
                "work_date": w.work_date.isoformat(),
                "status": w.status.value if hasattr(w.status, "value") else str(w.status),
                "total_actual_minutes": w.total_actual_minutes,
                "is_target_achieved": w.is_target_achieved,
                "submission_time": w.submission_time.isoformat() if w.submission_time else None,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "updated_at": w.updated_at.isoformat() if w.updated_at else None,
            }
            wlog_docs.append(doc)
        if wlog_docs:
            db.daily_worklogs.insert_many(wlog_docs)
            db.daily_worklogs.create_index([("mentor_id", pymongo.ASCENDING), ("work_date", pymongo.ASCENDING)], unique=True)
            db.daily_worklogs.create_index([("work_date", pymongo.ASCENDING)])
        print(f"Inserted {len(wlog_docs)} daily worklogs into MongoDB.")

        # 4. Worklog Activities
        activities = sqlite_db.query(WorklogActivity).all()
        print(f"Migrating {len(activities)} activities to MongoDB...")
        db.worklog_activities.drop()
        act_docs = []
        for a in activities:
            doc = {
                "_id": str(a.id),
                "worklog_id": str(a.worklog_id),
                "mentor_id": str(a.mentor_id),
                "category_id": str(a.category_id),
                "task_name": a.task_name,
                "task_description": a.task_description,
                "outcome": a.outcome,
                "priority": a.priority.value if hasattr(a.priority, "value") else str(a.priority),
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                "planned_minutes": a.planned_minutes,
                "start_time": a.start_time.isoformat(),
                "end_time": a.end_time.isoformat(),
                "actual_minutes": a.actual_minutes,
                "remarks": a.remarks,
                "dependencies": a.dependencies,
                "deviations": a.deviations,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
            }
            act_docs.append(doc)
        if act_docs:
            # Batch insert in chunks of 500
            for i in range(0, len(act_docs), 500):
                db.worklog_activities.insert_many(act_docs[i:i+500])
            db.worklog_activities.create_index([("worklog_id", pymongo.ASCENDING)])
            db.worklog_activities.create_index([("mentor_id", pymongo.ASCENDING)])
            db.worklog_activities.create_index([("start_time", pymongo.ASCENDING)])
        print(f"Inserted {len(act_docs)} activities into MongoDB.")

        # 5. Manager Feedback
        feedbacks = sqlite_db.query(ManagerFeedback).all()
        print(f"Migrating {len(feedbacks)} manager feedbacks to MongoDB...")
        db.manager_feedback.drop()
        fb_docs = []
        for f in feedbacks:
            doc = {
                "_id": str(f.id),
                "worklog_id": str(f.worklog_id),
                "manager_id": str(f.manager_id),
                "remarks": f.remarks,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            fb_docs.append(doc)
        if fb_docs:
            db.manager_feedback.insert_many(fb_docs)
            db.manager_feedback.create_index([("worklog_id", pymongo.ASCENDING)])
        print(f"Inserted {len(fb_docs)} feedback entries into MongoDB.")

        # 6. Mentor Skills
        skills = sqlite_db.query(MentorSkill).all()
        print(f"Migrating {len(skills)} mentor skills to MongoDB...")
        db.mentor_skills.drop()
        skill_docs = []
        for s in skills:
            doc = {
                "_id": str(s.id),
                "mentor_id": str(s.mentor_id),
                "skill_name": s.skill_name,
                "category_type": s.category_type.value if hasattr(s.category_type, "value") else str(s.category_type),
                "confidence_rating": s.confidence_rating,
                "status": s.status.value if hasattr(s.status, "value") else str(s.status),
                "notes": s.notes,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            skill_docs.append(doc)
        if skill_docs:
            db.mentor_skills.insert_many(skill_docs)
            db.mentor_skills.create_index([("mentor_id", pymongo.ASCENDING), ("skill_name", pymongo.ASCENDING)], unique=True)
        print(f"Inserted {len(skill_docs)} mentor skills into MongoDB.")

        # 7. Skill Growth Logs
        growth_logs = sqlite_db.query(SkillGrowthLog).all()
        print(f"Migrating {len(growth_logs)} skill growth logs to MongoDB...")
        db.skill_growth_logs.drop()
        glog_docs = []
        for g in growth_logs:
            doc = {
                "_id": str(g.id),
                "mentor_skill_id": str(g.mentor_skill_id),
                "mentor_id": str(g.mentor_id),
                "worklog_id": str(g.worklog_id) if g.worklog_id else None,
                "activity_id": str(g.activity_id) if g.activity_id else None,
                "previous_rating": g.previous_rating,
                "new_rating": g.new_rating,
                "status": g.status.value if g.status and hasattr(g.status, "value") else (str(g.status) if g.status else None),
                "log_date": g.log_date.isoformat(),
                "notes": g.notes,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            glog_docs.append(doc)
        if glog_docs:
            db.skill_growth_logs.insert_many(glog_docs)
            db.skill_growth_logs.create_index([("mentor_skill_id", pymongo.ASCENDING)])
            db.skill_growth_logs.create_index([("mentor_id", pymongo.ASCENDING)])
            db.skill_growth_logs.create_index([("log_date", pymongo.ASCENDING)])
        print(f"Inserted {len(glog_docs)} skill growth logs into MongoDB.")

        print("\nAll SQLite data successfully migrated into your MongoDB Atlas cluster!")
        print("Collections now live in MongoDB Atlas database 'niat_worklog':")
        for coll in db.list_collection_names():
            count = db[coll].count_documents({})
            print(f" - {coll}: {count} documents")

    finally:
        sqlite_db.close()
        client.close()

if __name__ == "__main__":
    migrate()
