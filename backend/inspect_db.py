import os
import sqlite3
import json

db_path = os.path.abspath('niat_worklog.db')
print('Database File:', db_path)
print('File Size:', f"{os.path.getsize(db_path) / 1024:.2f} KB")

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
tables = [row['name'] for row in cur.fetchall()]
print('\nTables in Database:', tables)

print('\n' + '='*60)
print('TABLE ROW COUNTS:')
print('='*60)
for t in tables:
    cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
    print(f" - {t:25s}: {cur.fetchone()['cnt']} rows")

print('\n' + '='*60)
print('1. USERS (Table: users):')
print('='*60)
cur.execute("""
    SELECT u.id, u.full_name, u.email, u.role, u.status, m.full_name as manager_name
    FROM users u
    LEFT JOIN users m ON u.manager_id = m.id
    ORDER BY u.role, u.full_name
""")
users = cur.fetchall()
for u in users:
    mgr_str = f" -> Manager: {u['manager_name']}" if u['manager_name'] else ""
    print(f" - [{u['role']:7s}] {u['full_name']:20s} ({u['email']:22s}) [{u['status']}]{mgr_str}")

print('\n' + '='*60)
print('2. CATEGORIES (Table: activity_categories):')
print('='*60)
cur.execute("SELECT id, name, activity_group, qualifies_for_six_hours FROM activity_categories ORDER BY activity_group, name")
for c in cur.fetchall():
    print(f" - {c['name']:35s} | Group: {c['activity_group']:15s} | Qualifies: {bool(c['qualifies_for_six_hours'])}")

print('\n' + '='*60)
print('3. WORKLOGS SUMMARY PER MENTOR (Table: daily_worklogs):')
print('='*60)
cur.execute("""
    SELECT 
        u.full_name,
        u.email,
        COUNT(w.id) as total_logs,
        SUM(CASE WHEN w.is_target_achieved = 1 THEN 1 ELSE 0 END) as target_achieved_days,
        SUM(w.total_actual_minutes) as total_minutes,
        MIN(w.work_date) as start_date,
        MAX(w.work_date) as end_date
    FROM users u
    JOIN daily_worklogs w ON u.id = w.mentor_id
    GROUP BY u.id
    ORDER BY total_minutes DESC
""")
for m in cur.fetchall():
    mins = m['total_minutes'] or 0
    hrs = f"{mins // 60}h {mins % 60:02d}m"
    print(f" - {m['full_name']:15s} ({m['email']:18s}): {m['total_logs']:2d} days ({m['start_date']} to {m['end_date']}) | Total: {hrs:8s} | Met Target: {m['target_achieved_days']:2d} days")

print('\n' + '='*60)
print('4. ACTIVITIES SUMMARY PER CATEGORY (Table: worklog_activities):')
print('='*60)
cur.execute("""
    SELECT c.name as cat_name, COUNT(a.id) as act_count, SUM(a.actual_minutes) as total_mins
    FROM worklog_activities a
    JOIN activity_categories c ON a.category_id = c.id
    GROUP BY c.id
    ORDER BY act_count DESC
""")
for a in cur.fetchall():
    mins = a['total_mins'] or 0
    hrs = f"{mins // 60}h {mins % 60:02d}m"
    print(f" - {a['cat_name']:35s}: {a['act_count']:3d} activities ({hrs})")

print('\n' + '='*60)
print('5. MANAGER FEEDBACKS (Table: manager_feedback):')
print('='*60)
cur.execute("""
    SELECT m.full_name as mgr_name, mentor.full_name as mentor_name, w.work_date, f.remarks
    FROM manager_feedback f
    JOIN users m ON f.manager_id = m.id
    JOIN daily_worklogs w ON f.worklog_id = w.id
    JOIN users mentor ON w.mentor_id = mentor.id
    ORDER BY w.work_date
""")
for f in cur.fetchall():
    print(f" - {f['mgr_name']} -> {f['mentor_name']} on {f['work_date']}:\n   \"{f['remarks']}\"")

conn.close()
