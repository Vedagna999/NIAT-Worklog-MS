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

def parse_date(s):
    if not s:
        return None
    s = s.strip()
    m = re.match(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?', s, re.IGNORECASE)
    if m:
        month_str = m.group(1).title()[:3]
        month_map = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}
        day = int(m.group(2))
        year = int(m.group(3)) if m.group(3) else 2026
        return date(year, month_map[month_str], day)
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

def parse_duration_str(dur_str):
    if not dur_str:
        return None
    dur_str = dur_str.strip()
    try:
        parts = dur_str.split(':')
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return None

def categorize_activity(cat_raw, task_raw, cat_map):
    c = cat_raw.strip().lower()
    t = task_raw.strip().lower()

    # 1. User Instruction: Shadowing is also a part of mentoring
    if 'shadow' in c or 'shadow' in t or 'mentoring' in c or 'mentoring' in t:
        return cat_map['Mentoring']
    if any(k in c for k in ['doubts resolving', 'facilitation', 'substitute class', 'lecture']):
        return cat_map['Mentoring']

    # 2. Learning
    if 'learn' in c or 'learn' in t or 'upskill' in c:
        return cat_map['NIAT-Learnings']

    # 3. Invigilation
    if 'invigilation' in c or 'mock trial' in c:
        return cat_map['Invigilation']

    # 4. Grading
    if 'marks' in c or 'grading' in c or 'entering marks' in c:
        return cat_map['Evaluation & Grading']

    # 5. Practice
    if 'practice' in c or 'quiz' in c:
        return cat_map.get('Coding Practice', cat_map['Mentoring'])

    # 6. Internal Meetings
    if any(k in c for k in ['connect', 'meeting', 'interaction', 'kt session', 'coordination', 'wellness', 'interview (panel)', 'syncup']):
        return cat_map['Internal Meetings']

    # 7. Administrative fallback
    return cat_map.get('Administrative', cat_map['NIAT-Learnings'])

def import_bhargav_data():
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

    if 'Internal Meetings' not in cat_map:
        c_meet = ActivityCategory(name='Internal Meetings', activity_group=ActivityGroup.ADMINISTRATIVE, qualifies_for_six_hours=True)
        db.add(c_meet)
        db.flush()
        cat_map['Internal Meetings'] = c_meet

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

    # 3. Create or update Mentor Bhargav
    bhargav = db.query(User).filter(User.email == 'bhargav@niat.edu').first()
    if not bhargav:
        bhargav = User(
            full_name='Bhargav',
            email='bhargav@niat.edu',
            password_hash=hash_password('password123'),
            role=UserRole.MENTOR,
            manager_id=kushal.id,
            status=UserStatus.ACTIVE
        )
        db.add(bhargav)
        db.flush()
    else:
        bhargav.full_name = 'Bhargav'
        bhargav.manager_id = kushal.id
        bhargav.role = UserRole.MENTOR
        db.flush()
    print(f'Mentor: {bhargav.full_name} ({bhargav.email}) -> Assigned to Manager: {kushal.full_name}')

    # 4. Fetch Google Sheet data for Bhargav (gid=2050869187)
    url = 'https://docs.google.com/spreadsheets/d/12xUJjtNvRlO8L_TmuszN5eplMxok1TYHhbJspEV9lAM/export?format=csv&gid=2050869187'
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
        priority_raw = r[4].strip() if len(r) > 4 else 'Medium'
        status_raw = r[5].strip() if len(r) > 5 else 'Completed'
        plan_t = r[6].strip() if len(r) > 6 else ''
        st_raw = r[7].strip() if len(r) > 7 else ''
        et_raw = r[9].strip() if len(r) > 9 else ''
        act_dur = r[10].strip() if len(r) > 10 else ''
        remarks = r[11].strip() if len(r) > 11 else ''
        deps = r[12].strip() if len(r) > 12 else ''
        devs = r[13].strip() if len(r) > 13 else ''

        # User Instruction: Dont consider lunch breaks
        c_low = cat_raw.lower()
        t_low = task.lower()
        if c_low in ['lunch', 'break'] or t_low in ['lunch', 'break', 'complete lunch'] or 'urgent work + lunch' in c_low:
            continue

        # Skip rows that are completely empty of actual tasks or times
        if not (cat_raw or task or st_raw):
            continue

        # Clean unicode characters
        task = task.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        outcome = outcome.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')
        remarks = remarks.replace('\u2013', '-').replace('\u2014', '-').replace('\ufffd', '-')

        # Categorize activity (User instruction: shadowing is also a part of mentoring)
        cat_obj = categorize_activity(cat_raw, task, cat_map)

        # Parse duration and times
        dur = parse_duration_str(act_dur) or parse_duration_str(plan_t)
        st = parse_time_str(st_raw)
        et = parse_time_str(et_raw)

        if not st:
            st = time(9, 30)
        if not et:
            if dur:
                et = (datetime.combine(current_date, st) + timedelta(minutes=dur)).time()
            else:
                et = time(st.hour + 1 if st.hour < 23 else 23, st.minute)

        dt_start = datetime.combine(current_date, st)
        dt_end = datetime.combine(current_date, et)

        # Handle afternoon time wraps and ensure end_time > start_time
        if dt_end <= dt_start:
            if et.hour < 12 and dt_start.hour >= 11:
                dt_end = datetime.combine(current_date, time(et.hour + 12, et.minute))
            elif dur:
                dt_end = dt_start + timedelta(minutes=dur)
            else:
                dt_end = dt_start + timedelta(minutes=30)

        # Ensure duration is strictly positive (> 0)
        if dur is None:
            dur_mins = max(1, int(round((dt_end - dt_start).total_seconds() / 60)))
        else:
            dur_mins = max(1, dur)

        prio_enum = TaskPriority.HIGH if priority_raw.lower() in ['high', 'highest'] else TaskPriority.MEDIUM
        status_enum = TaskStatus.COMPLETED if status_raw.lower() in ['completed', 'good'] else TaskStatus.IN_PROGRESS

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

    # Clear existing worklogs for Bhargav to ensure clean idempotent ingestion
    existing_wls = db.query(DailyWorklog).filter(DailyWorklog.mentor_id == bhargav.id).all()
    for w in existing_wls:
        db.delete(w)
    db.flush()

    inserted_worklogs = 0
    inserted_activities = 0

    for work_date, acts in sorted(activities_by_date.items()):
        total_min = sum(a['dur_mins'] for a in acts)
        is_achieved = (total_min >= 360)

        worklog = DailyWorklog(
            mentor_id=bhargav.id,
            work_date=work_date,
            status=WorklogStatus.SUBMITTED,
            total_actual_minutes=total_min,
            is_target_achieved=is_achieved,
            submission_time=datetime.combine(work_date, time(20, 0))
        )
        db.add(worklog)
        db.flush()
        inserted_worklogs += 1

        for a in acts:
            act_obj = WorklogActivity(
                worklog_id=worklog.id,
                mentor_id=bhargav.id,
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

    # 5. Add manager feedback from Kushal Kumar on Bhargav's Oct 13 high performance session
    oct13_worklog = db.query(DailyWorklog).filter(
        DailyWorklog.mentor_id == bhargav.id,
        DailyWorklog.work_date == date(2026, 10, 13)
    ).first()
    if oct13_worklog:
        fb = ManagerFeedback(
            worklog_id=oct13_worklog.id,
            manager_id=kushal.id,
            remarks='Tremendous dedication and mentoring leadership on computer programming sessions and Gen AI workflows! Keep up the stellar work.',
            created_at=datetime.combine(date(2026, 10, 13), time(20, 30))
        )
        db.add(fb)

    db.commit()
    print(f'Successfully imported {inserted_worklogs} worklogs and {inserted_activities} activities for Bhargav assigned to Manager Kushal Kumar!')
    db.close()

if __name__ == '__main__':
    import_bhargav_data()
