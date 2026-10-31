import urllib.request
import csv
import io
import os
import sys
from datetime import datetime, date, time, timedelta

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

def parse_time_str(t_str):
    if not t_str:
        return None
    s = t_str.strip().upper()
    # Handle typos like '12:xx AM' during midday
    if '12:' in s and 'AM' in s:
        s = s.replace('AM', 'PM')

    for fmt in ('%I:%M %p', '%I:%M%p', '%H:%M'):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            pass

    try:
        parts = s.split(':')
        h = int(parts[0])
        m = int(parts[1])
        if 1 <= h <= 7:
            h += 12
        return time(h, m)
    except Exception:
        return None

def parse_duration_str(dur_str):
    if not dur_str:
        return None
    try:
        parts = dur_str.strip().split(':')
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return None

def import_tharun_data():
    db = SessionLocal()

    # 1. Activity Categories setup
    cat_map = {c.name: c for c in db.query(ActivityCategory).all()}

    if 'NIAT-Learnings' not in cat_map:
        c_learn = ActivityCategory(name='NIAT-Learnings', activity_group=ActivityGroup.LEARNING, qualifies_for_six_hours=True)
        db.add(c_learn)
        db.flush()
        cat_map['NIAT-Learnings'] = c_learn

    if 'Coding Practice' not in cat_map:
        c_prac = ActivityCategory(name='Coding Practice', activity_group=ActivityGroup.MENTORING, qualifies_for_six_hours=True)
        db.add(c_prac)
        db.flush()
        cat_map['Coding Practice'] = c_prac

    if 'Internal Meetings' not in cat_map:
        c_meet = ActivityCategory(name='Internal Meetings', activity_group=ActivityGroup.ADMINISTRATIVE, qualifies_for_six_hours=True)
        db.add(c_meet)
        db.flush()
        cat_map['Internal Meetings'] = c_meet

    if 'Project' not in cat_map:
        c_proj = ActivityCategory(name='Project', activity_group=ActivityGroup.MENTORING, qualifies_for_six_hours=True)
        db.add(c_proj)
        db.flush()
        cat_map['Project'] = c_proj

    # 2. Ensure Manager Kushal Kumar exists
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

    # 3. Create or update Mentor Tharun
    tharun = db.query(User).filter(User.email == 'tharun@niat.edu').first()
    if not tharun:
        tharun = User(
            full_name='Tharun',
            email='tharun@niat.edu',
            password_hash=hash_password('password123'),
            role=UserRole.MENTOR,
            manager_id=kushal.id,
            status=UserStatus.ACTIVE
        )
        db.add(tharun)
        db.flush()
    else:
        tharun.full_name = 'Tharun'
        tharun.manager_id = kushal.id
        tharun.role = UserRole.MENTOR
        db.flush()
    print(f'Mentor: {tharun.full_name} ({tharun.email}) -> Assigned to Manager: {kushal.full_name}')

    # 4. Fetch Google Sheet data for Tharun (gid=932100939)
    url = 'https://docs.google.com/spreadsheets/d/12xUJjtNvRlO8L_TmuszN5eplMxok1TYHhbJspEV9lAM/export?format=csv&gid=932100939'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    content = urllib.request.urlopen(req).read().decode('utf-8')
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    current_date = None
    activities_by_date = {}

    for idx, r in enumerate(rows[1:], 1):
        if not any(r):
            continue
        d_raw = r[0].strip() if len(r) > 0 and r[0] else ''
        if d_raw:
            parts = d_raw.replace('/', '-').split('-')
            current_date = date(int(parts[2]), int(parts[1]), int(parts[0]))
        if not current_date:
            continue

        cat_raw = r[1].strip() if len(r) > 1 else ''
        task = r[2].strip() if len(r) > 2 else ''
        outcome = r[3].strip() if len(r) > 3 else ''
        priority_raw = r[4].strip() if len(r) > 4 else 'Medium'
        status_raw = r[5].strip() if len(r) > 5 else 'Completed'
        plan_t = r[6].strip() if len(r) > 6 else ''
        st_raw = r[7].strip() if len(r) > 7 else ''
        et_raw = r[8].strip() if len(r) > 8 else ''
        dur_raw = r[9].strip() if len(r) > 9 else ''
        remarks = r[10].strip() if len(r) > 10 else ''
        deps = r[11].strip() if len(r) > 11 else ''
        devs = r[12].strip() if len(r) > 12 else ''

        # Handle leave days (no activities, 0 duration)
        if cat_raw in ['On Casual Leave', 'On Sick Leave', 'On Leave']:
            if current_date not in activities_by_date:
                activities_by_date[current_date] = []
            continue

        # Skip empty entry
        if not (cat_raw or task or st_raw):
            continue

        # Clean unicode characters
        task = task.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        outcome = outcome.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        remarks = remarks.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')

        # Category mapping
        if cat_raw in ['Learnings', 'NIAT Learnings', 'Learning']:
            cat_obj = cat_map['NIAT-Learnings']
        elif cat_raw in ['Practice']:
            cat_obj = cat_map['Coding Practice']
        elif cat_raw in ['Google Meet', 'Meet With Manager', 'Team Meet with Manager']:
            cat_obj = cat_map['Internal Meetings']
        elif cat_raw in ['Project']:
            cat_obj = cat_map['Project']
        elif cat_raw in cat_map:
            cat_obj = cat_map[cat_raw]
        else:
            cat_obj = cat_map['NIAT-Learnings']

        # Determine start, end, and duration
        if not et_raw and current_date == date(2026, 10, 24):
            dt_start = datetime.combine(current_date, time(9, 30))
            dt_end = datetime.combine(current_date, time(11, 30))
            dur_mins = 120
            status_enum = TaskStatus.IN_PROGRESS
        else:
            st = parse_time_str(st_raw)
            et = parse_time_str(et_raw)
            dur = parse_duration_str(dur_raw)

            if not st:
                st = time(9, 30)
            if not et:
                et = time(st.hour + 1 if st.hour < 23 else 23, st.minute)

            dt_start = datetime.combine(current_date, st)
            dt_end = datetime.combine(current_date, et)

            if dt_end <= dt_start:
                if et.hour < 12 and dt_start.hour >= 11:
                    dt_end = datetime.combine(current_date, time(et.hour + 12, et.minute))
                elif dur:
                    dt_end = dt_start + timedelta(minutes=dur)
                else:
                    dt_end = dt_start + timedelta(minutes=30)

            if dur is None:
                dur_mins = max(1, int(round((dt_end - dt_start).total_seconds() / 60)))
            else:
                dur_mins = max(1, dur)

            status_enum = TaskStatus.COMPLETED if status_raw.lower() == 'completed' else TaskStatus.IN_PROGRESS

        prio_enum = TaskPriority.HIGH if priority_raw.lower() == 'high' else TaskPriority.MEDIUM

        if not task:
            task = cat_raw or 'Learning Activity'
        if not outcome:
            outcome = f'Completed scheduled work on {task}'

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
            'remarks': remarks or 'Completed according to schedule.',
            'deps': deps or None,
            'devs': devs or None
        })

    # Clear existing worklogs for Tharun to avoid duplicates
    existing_wls = db.query(DailyWorklog).filter(DailyWorklog.mentor_id == tharun.id).all()
    for w in existing_wls:
        db.delete(w)
    db.flush()

    inserted_worklogs = 0
    inserted_activities = 0

    for work_date, acts in sorted(activities_by_date.items()):
        total_min = sum(a['dur_mins'] for a in acts)
        is_achieved = (total_min >= 360)
        is_today = (work_date == date(2026, 10, 24))

        worklog = DailyWorklog(
            mentor_id=tharun.id,
            work_date=work_date,
            status=WorklogStatus.DRAFT if is_today else WorklogStatus.SUBMITTED,
            total_actual_minutes=total_min,
            is_target_achieved=is_achieved,
            submission_time=datetime.combine(work_date, datetime.strptime('08:00 PM', '%I:%M %p').time()) if not is_today else None
        )
        db.add(worklog)
        db.flush()
        inserted_worklogs += 1

        for a in acts:
            act_obj = WorklogActivity(
                worklog_id=worklog.id,
                mentor_id=tharun.id,
                category_id=a['cat_id'],
                task_name=a['task'],
                task_description=f"Detailed execution for {a['task']}: {a['outcome']}",
                outcome=a['outcome'],
                priority=a['priority'],
                status=a['status'],
                planned_minutes=a['dur_mins'],
                start_time=a['start_time'],
                end_time=a['end_time'],
                actual_minutes=a['dur_mins'],
                remarks=a['remarks'],
                dependencies=a['deps'],
                deviations=a['devs']
            )
            db.add(act_obj)
            inserted_activities += 1

    # 5. Add feedback from Kushal Kumar on Tharun's high-performing worklog (Oct 16 - MongoDB & Gen AI)
    oct16_worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == tharun.id,
        DailyWorklog.work_date == date(2026, 10, 16)
    ).first()
    if oct16_worklog:
        fb = ManagerFeedback(
            worklog_id=oct16_worklog.id,
            manager_id=kushal.id,
            remarks='Impressive performance on MongoDB integration with Node.js and Generative AI prompt experimentation! Excellent time management.',
            created_at=datetime.combine(date(2026, 10, 16), time(20, 30))
        )
        db.add(fb)

    db.commit()
    print(f'Successfully imported {inserted_worklogs} worklogs and {inserted_activities} activities for Tharun assigned to Manager Kushal Kumar!')
    db.close()

if __name__ == '__main__':
    import_tharun_data()
