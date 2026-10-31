import urllib.request
import csv
import io
import os
import sys
import re
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

def parse_date(d_str):
    if not d_str:
        return None
    parts = d_str.strip().replace('-', '/').split('/')
    if len(parts) == 3:
        day = int(parts[0])
        month = int(parts[1])
        year = int(parts[2])
        if year < 100:
            year += 2000
        return date(year, month, day)
    return None

def parse_time_str(t_str):
    if not t_str:
        return None
    s = t_str.strip().upper()
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
        m = int(parts[1]) if len(parts) > 1 else 0
        if 1 <= h <= 7:
            h += 12
        return time(h, m)
    except Exception:
        return None

def parse_dur_str(s):
    if not s:
        return None
    # Fix typos like '5OMin' where letter O was typed instead of 0
    s = s.strip().replace('5O', '50').replace('5o', '50')
    if ':' in s:
        parts = s.split(':')
        try:
            return int(parts[0]) * 60 + int(parts[1])
        except Exception:
            pass
    hours, mins = 0, 0
    h_m = re.search(r'(\d+)\s*(?:hour|hours|hr|hrs)', s, re.IGNORECASE)
    if h_m:
        hours = int(h_m.group(1))
    m_m = re.search(r'(\d+)\s*(?:min|mins|minute|minutes)', s, re.IGNORECASE)
    if m_m:
        mins = int(m_m.group(1))
    elif not h_m and s.isdigit():
        mins = int(s)
    total = hours * 60 + mins
    return total if total > 0 else None

def categorize_activity(cat_raw, task_raw, cat_map):
    c = cat_raw.strip().lower()
    t = task_raw.strip().lower()

    # 1. Invigilation (including spelling mistake 'Invisilation' in Category or Task)
    if 'invisilation' in c or 'invigilation' in c or 'invisilation' in t or 'invigilation' in t:
        return cat_map['Invigilation']

    # 2. Evaluation & Grading (Papers correction)
    if 'correction' in c or 'grading' in c or 'papers' in c or 'correction' in t:
        return cat_map['Evaluation & Grading']

    # 3. Content Prep (Fix spelling mistake 'Workshop Perparation')
    if 'perparation' in c or 'preparation' in c:
        return cat_map['Content Prep']

    # 4. Mentoring & Doubt Solving / Workshop delivery / Doubt clarification
    if any(k in c for k in ['mentoring', 'doubt', 'doubts', 'workshop']):
        return cat_map['Mentoring']
    if 'completed coding practice and doubts solving' in c:
        return cat_map['Mentoring']
    if 'doubt' in t or 'mentoring' in t:
        return cat_map['Mentoring']

    # 5. Administrative & Operational Work (Fix spelling mistake 'Journolling', Student Verification, Fest)
    if any(k in c for k in ['journolling', 'journaling', 'worklogging', 'operational', 'fest']):
        return cat_map['Administrative']

    # 6. NIAT-Learnings / Conceptual Upskilling
    if 'learn' in c or 'learn' in t or 'revision' in t or 'video' in t or 'concept' in t:
        return cat_map['NIAT-Learnings']

    # 7. Practice / Quiz
    if 'practice' in t or 'quiz' in t or 'mcq' in t:
        return cat_map.get('Coding Practice', cat_map['Mentoring'])

    return cat_map.get('Administrative', cat_map['NIAT-Learnings'])

def import_rahul_data():
    db = SessionLocal()

    # 1. Setup / ensure activity categories exist
    cat_map = {c.name: c for c in db.query(ActivityCategory).all()}

    if 'Mentoring' not in cat_map:
        c_m = ActivityCategory(name='Mentoring', activity_group=ActivityGroup.MENTORING, qualifies_for_six_hours=True)
        db.add(c_m)
        db.flush()
        cat_map['Mentoring'] = c_m

    if 'NIAT-Learnings' not in cat_map:
        c_l = ActivityCategory(name='NIAT-Learnings', activity_group=ActivityGroup.LEARNING, qualifies_for_six_hours=True)
        db.add(c_l)
        db.flush()
        cat_map['NIAT-Learnings'] = c_l

    if 'Coding Practice' not in cat_map:
        c_p = ActivityCategory(name='Coding Practice', activity_group=ActivityGroup.MENTORING, qualifies_for_six_hours=True)
        db.add(c_p)
        db.flush()
        cat_map['Coding Practice'] = c_p

    if 'Invigilation' not in cat_map:
        c_i = ActivityCategory(name='Invigilation', activity_group=ActivityGroup.INVIGILATION, qualifies_for_six_hours=True)
        db.add(c_i)
        db.flush()
        cat_map['Invigilation'] = c_i

    if 'Evaluation & Grading' not in cat_map:
        c_g = ActivityCategory(name='Evaluation & Grading', activity_group=ActivityGroup.MENTORING, qualifies_for_six_hours=True)
        db.add(c_g)
        db.flush()
        cat_map['Evaluation & Grading'] = c_g

    if 'Content Prep' not in cat_map:
        c_cp = ActivityCategory(name='Content Prep', activity_group=ActivityGroup.ADMINISTRATIVE, qualifies_for_six_hours=True)
        db.add(c_cp)
        db.flush()
        cat_map['Content Prep'] = c_cp

    if 'Administrative' not in cat_map:
        c_admin = ActivityCategory(name='Administrative', activity_group=ActivityGroup.ADMINISTRATIVE, qualifies_for_six_hours=True)
        db.add(c_admin)
        db.flush()
        cat_map['Administrative'] = c_admin

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

    # 3. Create or update Mentor Rahul
    rahul = db.query(User).filter(User.email == 'rahul@niat.edu').first()
    if not rahul:
        rahul = User(
            full_name='Rahul',
            email='rahul@niat.edu',
            password_hash=hash_password('password123'),
            role=UserRole.MENTOR,
            manager_id=kushal.id,
            status=UserStatus.ACTIVE
        )
        db.add(rahul)
        db.flush()
    else:
        rahul.full_name = 'Rahul'
        rahul.manager_id = kushal.id
        rahul.role = UserRole.MENTOR
        db.flush()
    print(f'Mentor: {rahul.full_name} ({rahul.email}) -> Assigned to Manager: {kushal.full_name}')

    # 4. Fetch Google Sheet data for Rahul (gid=1210226401)
    url = 'https://docs.google.com/spreadsheets/d/12xUJjtNvRlO8L_TmuszN5eplMxok1TYHhbJspEV9lAM/export?format=csv&gid=1210226401'
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
        pd = parse_date(d_raw)
        if pd:
            current_date = pd
        if not current_date:
            continue

        cat_raw = r[1].strip() if len(r) > 1 else ''
        task = r[2].strip() if len(r) > 2 else ''
        outcome = r[3].strip() if len(r) > 3 else ''
        priority_raw = r[5].strip() if len(r) > 5 else 'Medium'
        status_raw = r[6].strip() if len(r) > 6 else 'Done'
        plan_t = r[7].strip() if len(r) > 7 else ''
        st_raw = r[8].strip() if len(r) > 8 else ''
        et_raw = r[9].strip() if len(r) > 9 else ''
        act_dur = r[10].strip() if len(r) > 10 else ''
        remarks = r[11].strip() if len(r) > 11 else ''
        deps = r[12].strip() if len(r) > 12 else ''
        devs = r[13].strip() if len(r) > 13 else ''

        # Skip rows that are completely empty
        if not (cat_raw or task or st_raw):
            continue

        # Handle fest day (university celebration)
        if task.lower() == 'fest' and not (st_raw or act_dur or plan_t):
            if current_date not in activities_by_date:
                activities_by_date[current_date] = []
            continue

        # Clean unicode characters
        task = task.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        outcome = outcome.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        remarks = remarks.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')

        # Categorize activity (fixing spelling mistakes like 'Invisilation', 'Journolling', 'Workshop Perparation')
        cat_obj = categorize_activity(cat_raw, task, cat_map)

        # Parse duration and times
        dur = parse_dur_str(act_dur) or parse_dur_str(plan_t)
        st = parse_time_str(st_raw)
        et = parse_time_str(et_raw)

        # Special handling for days like 15/10/26 where time columns were left blank but status is Done
        if not st and not et:
            st = time(9, 30)
            et = time(10, 20)
            dur = 50

        if not st:
            st = time(9, 30)
        if not et:
            if dur:
                et = (datetime.combine(current_date, st) + timedelta(minutes=dur)).time()
            else:
                et = time(st.hour + 1 if st.hour < 23 else 23, st.minute)

        dt_start = datetime.combine(current_date, st)
        dt_end = datetime.combine(current_date, et)

        # Ensure end_time > start_time and handle afternoon times without PM
        if dt_end <= dt_start:
            if et.hour < 12 and dt_start.hour >= 11:
                dt_end = datetime.combine(current_date, time(et.hour + 12, et.minute))
            elif dur:
                dt_end = dt_start + timedelta(minutes=dur)
            else:
                dt_end = dt_start + timedelta(minutes=50)

        # Ensure duration is strictly positive (> 0)
        if dur is None:
            dur_mins = max(1, int(round((dt_end - dt_start).total_seconds() / 60)))
        else:
            dur_mins = max(1, dur)

        prio_enum = TaskPriority.HIGH if priority_raw.lower() in ['high', 'highest'] else TaskPriority.MEDIUM
        status_enum = TaskStatus.COMPLETED if status_raw.lower() in ['completed', 'done'] else TaskStatus.IN_PROGRESS

        if not task or task == '-':
            task = cat_raw or 'Instruction & Mentoring Session'
        if not outcome or outcome == '-':
            outcome = f'Completed {task} successfully'

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

    # Clear existing worklogs for Rahul to ensure clean idempotent ingestion
    existing_wls = db.query(DailyWorklog).filter(DailyWorklog.mentor_id == rahul.id).all()
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
            mentor_id=rahul.id,
            work_date=work_date,
            status=WorklogStatus.DRAFT if is_today else WorklogStatus.SUBMITTED,
            total_actual_minutes=total_min,
            is_target_achieved=is_achieved,
            submission_time=datetime.combine(work_date, time(20, 0)) if not is_today else None
        )
        db.add(worklog)
        db.flush()
        inserted_worklogs += 1

        for a in acts:
            act_obj = WorklogActivity(
                worklog_id=worklog.id,
                mentor_id=rahul.id,
                category_id=a['cat_id'],
                task_name=a['task'],
                task_description=f"Detailed execution for {a['task']}: {a['outcome'][:150]}",
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

    # 5. Add manager feedback from Kushal Kumar on Rahul's 6h target achievement day (Sep 28)
    sep28_worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == rahul.id,
        DailyWorklog.work_date == date(2026, 9, 28)
    ).first()
    if sep28_worklog:
        fb = ManagerFeedback(
            worklog_id=sep28_worklog.id,
            manager_id=kushal.id,
            remarks='Excellent work covering Python loops, String Methods, and HTML Hyperlinks! Great mentoring dedication.',
            created_at=datetime.combine(date(2026, 9, 28), time(20, 30))
        )
        db.add(fb)

    db.commit()
    print(f'Successfully imported {inserted_worklogs} worklogs and {inserted_activities} activities for Rahul assigned to Manager Kushal Kumar!')
    db.close()

if __name__ == '__main__':
    import_rahul_data()
