import os
import sys
from datetime import date, datetime, timedelta, timezone
import uuid

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.models import (
    User,
    UserRole,
    MentorSkill,
    SkillGrowthLog,
    SkillCategoryType,
    SkillStatus,
    DailyWorklog,
    WorklogActivity
)

def seed_skills():
    print("Creating tables if not exist...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        mentors = db.query(User).filter(User.role == UserRole.MENTOR).all()
        print(f"Found {len(mentors)} mentors in database.")

        # Mentor profile templates
        mentor_skill_map = {
            "tharun": [
                {
                    "name": "Python",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.5,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "Core backend language, data structures and algorithms mentoring.",
                    "progression": [
                        (3.0, -45, "Initial confidence when joining mentoring team"),
                        (3.5, -30, "Covered advanced data structures, recursion and dynamic programming"),
                        (4.0, -14, "Conducted live problem-solving sessions and code reviews"),
                        (4.5, -2, "Built automation scripts and solved competitive programming sets")
                    ]
                },
                {
                    "name": "React",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 3.5,
                    "status": SkillStatus.CURRENTLY_LEARNING,
                    "notes": "Component architecture, hooks, state management with context and redux.",
                    "progression": [
                        (2.0, -40, "Started learning modern React & JSX components"),
                        (2.5, -25, "Mastered useState, useEffect, and custom hooks"),
                        (3.5, -5, "Implemented interactive dashboards and state management")
                    ]
                },
                {
                    "name": "Data Structures & Algorithms",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.0,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "Arrays, Trees, Graphs, Sorting, Complexity analysis.",
                    "progression": [
                        (3.0, -50, "Standard DSA curriculum"),
                        (3.5, -20, "Binary search, dynamic programming problem sets"),
                        (4.0, -4, "Mentoring students in algorithmic complexity")
                    ]
                },
                {
                    "name": "Prompt Engineering",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 3.5,
                    "status": SkillStatus.CURRENTLY_LEARNING,
                    "notes": "Few-shot prompting, system design for LLM agents, chain of thought.",
                    "progression": [
                        (2.5, -30, "Explored zero-shot and few-shot prompt patterns"),
                        (3.5, -8, "Designed prompt evaluation workflows and tested Gemini models")
                    ]
                },
                {
                    "name": "Mentoring & Coaching",
                    "type": SkillCategoryType.NON_TECHNICAL,
                    "rating": 4.0,
                    "status": SkillStatus.FAMILIAR,
                    "notes": "1-on-1 doubt clearing, motivating students, structured feedback.",
                    "progression": [
                        (3.0, -45, "Started cohort mentoring"),
                        (4.0, -10, "Developed structured weekly review process")
                    ]
                }
            ],
            "bhargav": [
                {
                    "name": "JavaScript",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.0,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "ES6+, async/await, closures, DOM manipulation, event loop.",
                    "progression": [
                        (3.0, -40, "Base JavaScript and asynchronous programming"),
                        (3.5, -20, "Promises, microtasks, event loop mechanics"),
                        (4.0, -6, "Mentored cohort on clean JS practices and patterns")
                    ]
                },
                {
                    "name": "React",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.0,
                    "status": SkillStatus.FAMILIAR,
                    "notes": "Reusable UI components, routing, form validation.",
                    "progression": [
                        (2.5, -45, "React fundamentals and components"),
                        (3.0, -25, "Routing and API integration with fetch/axios"),
                        (4.0, -7, "Component performance optimization and memoization")
                    ]
                },
                {
                    "name": "SQL",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 3.5,
                    "status": SkillStatus.CURRENTLY_LEARNING,
                    "notes": "Joins, aggregations, schema design, subqueries and indexing.",
                    "progression": [
                        (2.0, -35, "Relational DB basics and simple queries"),
                        (3.0, -18, "Complex joins, grouping, and subquery writing"),
                        (3.5, -3, "Optimized query plans and added composite indexes")
                    ]
                },
                {
                    "name": "Code Review & Feedback",
                    "type": SkillCategoryType.NON_TECHNICAL,
                    "rating": 4.0,
                    "status": SkillStatus.FAMILIAR,
                    "notes": "Providing constructive inline PR reviews and architectural advice.",
                    "progression": [
                        (3.0, -30, "Initial code grading"),
                        (4.0, -5, "Adopted automated linting guidelines and rubric feedback")
                    ]
                }
            ],
            "rahul": [
                {
                    "name": "Python",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.0,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "Object-oriented design, list comprehensions, standard library.",
                    "progression": [
                        (3.0, -35, "Python core concepts and OOP fundamentals"),
                        (3.5, -15, "Generators, decorators, and context managers"),
                        (4.0, -4, "Enterprise backend architecture in Python")
                    ]
                },
                {
                    "name": "Node.js",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 3.5,
                    "status": SkillStatus.CURRENTLY_LEARNING,
                    "notes": "Backend service development, middleware, npm ecosystem.",
                    "progression": [
                        (2.0, -30, "Node runtime, HTTP server module"),
                        (3.0, -12, "Express server creation and JWT authentication"),
                        (3.5, -2, "Database connectivity with connection pooling")
                    ]
                },
                {
                    "name": "MongoDB",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 3.5,
                    "status": SkillStatus.CURRENTLY_LEARNING,
                    "notes": "Document modeling, aggregation pipelines, Mongoose schemas.",
                    "progression": [
                        (2.0, -28, "NoSQL fundamentals and CRUD commands"),
                        (3.0, -14, "Aggregation framework and $lookup operations"),
                        (3.5, -5, "Mongoose middleware and indexing strategies")
                    ]
                },
                {
                    "name": "Problem Solving & Debugging Guidance",
                    "type": SkillCategoryType.NON_TECHNICAL,
                    "rating": 4.5,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "Methodical root cause analysis and assisting students unblock errors.",
                    "progression": [
                        (3.5, -40, "General debugging assistance"),
                        (4.5, -8, "Created standard troubleshooting checklist for cohorts")
                    ]
                }
            ],
            "vedagna": [
                {
                    "name": "Python",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.5,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "FastAPI, asynchronous event loops, typing, testing.",
                    "progression": [
                        (3.5, -50, "Full stack backend development"),
                        (4.0, -25, "FastAPI microservices and SQLAlchemy integration"),
                        (4.5, -6, "High performance asynchronous API design")
                    ]
                },
                {
                    "name": "React",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.5,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "TypeScript, Tailwind CSS, component modularization, modern hooks.",
                    "progression": [
                        (3.0, -45, "React ecosystem and component patterns"),
                        (4.0, -20, "TypeScript integration and responsive layouts"),
                        (4.5, -5, "State management, performance tuning and animations")
                    ]
                },
                {
                    "name": "AI / ML",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 3.5,
                    "status": SkillStatus.CURRENTLY_LEARNING,
                    "notes": "Generative AI, LLM prompting, agent workflows.",
                    "progression": [
                        (2.5, -35, "Understanding foundation models and tokenization"),
                        (3.0, -18, "Prompt engineering patterns and temperature tuning"),
                        (3.5, -4, "Agentic coding workflows and evaluation")
                    ]
                },
                {
                    "name": "System Design",
                    "type": SkillCategoryType.TECHNICAL,
                    "rating": 4.0,
                    "status": SkillStatus.FAMILIAR,
                    "notes": "Scalable REST APIs, relational vs document storage, indexing.",
                    "progression": [
                        (3.0, -40, "Tiered architecture design"),
                        (4.0, -10, "Database partitioning, caching and connection pooling")
                    ]
                },
                {
                    "name": "Technical Communication",
                    "type": SkillCategoryType.NON_TECHNICAL,
                    "rating": 4.5,
                    "status": SkillStatus.PROFICIENT,
                    "notes": "Clear architectural documentation, concise pull request write-ups.",
                    "progression": [
                        (3.5, -35, "Technical documentation drafting"),
                        (4.5, -7, "Cross-functional team alignment and mentor briefings")
                    ]
                }
            ]
        }

        today = date.today()

        for mentor in mentors:
            # Check if mentor already has skills
            existing_count = db.query(MentorSkill).filter(MentorSkill.mentor_id == mentor.id).count()
            if existing_count > 0:
                print(f"Mentor {mentor.full_name} ({mentor.email}) already has {existing_count} skills. Skipping.")
                continue

            # Determine key
            matched_key = None
            for key in mentor_skill_map:
                if key in mentor.full_name.lower() or key in mentor.email.lower():
                    matched_key = key
                    break

            # Fallback to vedagna's skills or tharun's skills if generic mentor
            if not matched_key:
                matched_key = "tharun"

            skill_defs = mentor_skill_map[matched_key]
            print(f"Seeding {len(skill_defs)} skills for {mentor.full_name} ({mentor.email})...")

            # Find some recent worklogs and activities of this mentor to link evidence
            recent_activities = (
                db.query(WorklogActivity)
                .join(DailyWorklog)
                .filter(WorklogActivity.mentor_id == mentor.id)
                .order_by(DailyWorklog.work_date.desc())
                .limit(20)
                .all()
            )

            for sdef in skill_defs:
                now = datetime.now(timezone.utc)
                skill = MentorSkill(
                    mentor_id=mentor.id,
                    skill_name=sdef["name"],
                    category_type=sdef["type"],
                    confidence_rating=sdef["rating"],
                    status=sdef["status"],
                    notes=sdef["notes"],
                    created_at=now - timedelta(days=60),
                    updated_at=now
                )
                db.add(skill)
                db.flush()

                # Add progression logs
                progression = sdef.get("progression", [])
                prev_rating = None
                for idx, (step_rating, days_offset, step_note) in enumerate(progression):
                    step_date = today + timedelta(days=days_offset)
                    step_status = sdef["status"] if idx == len(progression) - 1 else SkillStatus.CURRENTLY_LEARNING

                    # Try to link to an activity if possible
                    linked_act = None
                    linked_wlog_id = None
                    if recent_activities and idx > 0:
                        linked_act = recent_activities[idx % len(recent_activities)]
                        linked_wlog_id = linked_act.worklog_id

                    log = SkillGrowthLog(
                        mentor_skill_id=skill.id,
                        mentor_id=mentor.id,
                        worklog_id=linked_wlog_id,
                        activity_id=linked_act.id if linked_act else None,
                        previous_rating=prev_rating,
                        new_rating=step_rating,
                        status=step_status,
                        log_date=step_date,
                        notes=step_note,
                        created_at=datetime.combine(step_date, datetime.min.time(), tzinfo=timezone.utc)
                    )
                    db.add(log)
                    prev_rating = step_rating

            db.commit()
            print(f"Successfully seeded skills for {mentor.full_name}!")

        print("All mentor skills seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_skills()
