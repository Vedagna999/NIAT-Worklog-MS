import urllib.request
import csv
import io
import os
import sys
from datetime import datetime, date

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import (
    User,
    UserRole,
    UserStatus,
    DailyWorklog,
    WorklogActivity,
    ActivityCategory,
    ActivityGroup,
    WorklogStatus,
    TaskPriority,
    TaskStatus,
    ManagerFeedback
)
from app.auth import hash_password

def import_data():
    db = SessionLocal()

    # 1. Categories setup
    cat_map = {c.name: c for c in db.query(ActivityCategory).all()}

    if 'Coding Practice' not in cat_map:
        c1 = ActivityCategory(name='Coding Practice', activity_group=ActivityGroup.MENTORING, qualifies_for_six_hours=True)
        db.add(c1)
        db.flush()
        cat_map['Coding Practice'] = c1

    if 'Online Live Classes for NIAT Students' not in cat_map:
        c2 = ActivityCategory(name='Online Live Classes for NIAT Students', activity_group=ActivityGroup.MENTORING, qualifies_for_six_hours=True)
        db.add(c2)
        db.flush()
        cat_map['Online Live Classes for NIAT Students'] = c2

    # 2. Kushal Kumar (Manager)
    kushal = db.query(User).filter(User.email == 'kushal@niat.edu').first()
    if not kushal:
        kushal = User(
            full_name='Kushal Kumar',
            email='kushal@niat.edu',
            password_hash=hash_password('password123'),
            role=UserRole.MANAGER,
            status=UserStatus.ACTIVE
        )
        db.add(kushal)
        db.flush()
    print(f'Manager: {kushal.full_name} ({kushal.email}) -> ID: {kushal.id}')

    # 3. Vedagna (Mentor)
    vedagna = db.query(User).filter(User.email == 'vedagna@niat.edu').first()
    if not vedagna:
        vedagna = User(
            full_name='Vedagna',
            email='vedagna@niat.edu',
            password_hash=hash_password('password123'),
            role=UserRole.MENTOR,
            manager_id=kushal.id,
            status=UserStatus.ACTIVE
        )
        db.add(vedagna)
        db.flush()
    else:
        vedagna.manager_id = kushal.id
        db.flush()
    print(f'Mentor: {vedagna.full_name} ({vedagna.email}) -> Assigned to Manager: {kushal.full_name}')

    # 4. Fetch Google Sheet data and insert
    url = 'https://docs.google.com/spreadsheets/d/12xUJjtNvRlO8L_TmuszN5eplMxok1TYHhbJspEV9lAM/export?format=csv&gid=1393715027'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    content = urllib.request.urlopen(req).read().decode('utf-8')
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    month_map = {'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12, 'Jan': 1}
    current_date = None
    activities_by_date = {}

    for r in rows[1:]:
        if not any(r):
            continue
        d_raw = r[0].strip() if len(r) > 0 and r[0] else ''
        if d_raw:
            parts = d_raw.split()
            current_date = date(2026, month_map[parts[0]], int(parts[1]))
        if not current_date:
            continue

        cat_raw = r[1].strip() if len(r) > 1 else ''
        task = r[2].strip() if len(r) > 2 else ''
        outcome = r[3].strip() if len(r) > 3 else ''
        priority_raw = r[4].strip() if len(r) > 4 else 'Medium'
        status_raw = r[5].strip() if len(r) > 5 else 'Completed'
        start_t_raw = r[7].strip() if len(r) > 7 else ''
        end_t_raw = r[8].strip() if len(r) > 8 else ''
        remarks = r[10].strip() if len(r) > 10 else ''
        deps = r[11].strip() if len(r) > 11 else ''
        devs = r[12].strip() if len(r) > 12 else ''

        if not (cat_raw or task or start_t_raw):
            continue

        # Clean unicode dash characters
        task = task.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        outcome = outcome.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        remarks = remarks.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')

        # Category resolution
        if cat_raw in ['Learnings', 'NIAT-Learnings']:
            cat_obj = cat_map['NIAT-Learnings']
        elif cat_raw in cat_map:
            cat_obj = cat_map[cat_raw]
        else:
            cat_obj = cat_map['NIAT-Learnings']

        # Time parsing
        dt_start_time = datetime.strptime(start_t_raw, '%I:%M %p').time()
        dt_end_time = datetime.strptime(end_t_raw, '%I:%M %p').time()
        dt_start = datetime.combine(current_date, dt_start_time)
        dt_end = datetime.combine(current_date, dt_end_time)
        dur_mins = int(round((dt_end - dt_start).total_seconds() / 60))

        prio_enum = TaskPriority.HIGH if priority_raw.lower() == 'high' else TaskPriority.MEDIUM
        status_enum = TaskStatus.COMPLETED if status_raw.lower() == 'completed' else TaskStatus.IN_PROGRESS

        if current_date not in activities_by_date:
            activities_by_date[current_date] = []

        activities_by_date[current_date].append({
            'cat_id': cat_obj.id,
            'task': task,
            'outcome': outcome,
            'priority': prio_enum,
            'status': status_enum,
            'start_time': dt_start,
            'end_time': dt_end,
            'dur_mins': dur_mins,
            'remarks': remarks,
            'deps': deps,
            'devs': devs
        })

    # Clear existing worklogs for Vedagna to avoid duplicates if re-run
    existing_wls = db.query(DailyWorklog).filter(DailyWorklog.mentor_id == vedagna.id).all()
    for w in existing_wls:
        db.delete(w)
    db.flush()

    inserted_worklogs = 0
    inserted_activities = 0

    for work_date, acts in activities_by_date.items():
        total_min = sum(a['dur_mins'] for a in acts)
        is_achieved = (total_min >= 360)

        worklog = DailyWorklog(
            mentor_id=vedagna.id,
            work_date=work_date,
            status=WorklogStatus.SUBMITTED,
            total_actual_minutes=total_min,
            is_target_achieved=is_achieved,
            submission_time=datetime.combine(work_date, datetime.strptime('08:00 PM', '%I:%M %p').time())
        )
        db.add(worklog)
        db.flush()
        inserted_worklogs += 1

        for a in acts:
            act_obj = WorklogActivity(
                worklog_id=worklog.id,
                mentor_id=vedagna.id,
                category_id=a['cat_id'],
                task_name=a['task'],
                task_description=f"Detailed execution for {a['task']}",
                outcome=a['outcome'],
                priority=a['priority'],
                status=a['status'],
                planned_minutes=a['dur_mins'],
                start_time=a['start_time'],
                end_time=a['end_time'],
                actual_minutes=a['dur_mins'],
                remarks=a['remarks'] or 'Executed according to schedule.',
                dependencies=a['deps'] or None,
                deviations=a['devs'] or None
            )
            db.add(act_obj)
            inserted_activities += 1

    # Add feedback from Kushal Kumar on Oct 17 worklog
    oct17_worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == vedagna.id,
        DailyWorklog.work_date == date(2026, 10, 17)
    ).first()
    if oct17_worklog:
        fb = ManagerFeedback(
            worklog_id=oct17_worklog.id,
            manager_id=kushal.id,
            remarks='Excellent progress on Node.js backend development and proactive AI tool exploration for the Performance Management System! Keep up the great work.',
            created_at=datetime.combine(date(2026, 10, 17), datetime.strptime('08:30 PM', '%I:%M %p').time())
        )
        db.add(fb)

    db.commit()
    print(f'Successfully imported {inserted_worklogs} worklogs and {inserted_activities} activities for Vedagna mapped to Manager Kushal Kumar!')
    db.close()

if __name__ == '__main__':
    import_data()
