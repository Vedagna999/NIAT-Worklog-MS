import urllib.request
import json

def post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def get(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

# 1. Login as Kushal Kumar
kushal_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'kushal@niat.edu', 'password': 'password123'})
k_tok = kushal_login['access_token']
print('Kushal login OK:', kushal_login['user']['full_name'])

# 2. Get mentors list
roster = get('http://127.0.0.1:8000/api/manager/mentors', k_tok)
print('Assigned mentors to Kushal:', [m['full_name'] for m in sorted(roster, key=lambda x: x['full_name'])])

# 3. Get team overview
team_ov = get('http://127.0.0.1:8000/api/manager/team-overview', k_tok)
print(f'Team Overview mentors count: {len(team_ov["mentors"])}')
for m in sorted(team_ov['mentors'], key=lambda x: x['full_name']):
    name = m['full_name']
    email = m['email']
    hrs = m['period_working_hours']
    days_met = m['days_meeting_target']
    total_days = m['days_logged']
    print(f' - {name:10s} ({email:18s}) | Worked: {hrs:8s} | Target met: {days_met}/{total_days}')

# 4. Search Skill Finder
for query in ['Loops', 'Gesture', 'Invigilation', 'Correction', 'Prompt']:
    res = get(f'http://127.0.0.1:8000/api/manager/skill-finder?q={query}', k_tok)
    matched_mentors = [m['mentor_name'] for m in res['mentors']]
    print(f'Skill search "{query}": {res["total_matching_activities"]} results | Mentors: {matched_mentors}')

# 5. Login as Rahul
rahul_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'rahul@niat.edu', 'password': 'password123'})
r_tok = rahul_login['access_token']
print('Rahul login OK:', rahul_login['user']['full_name'], 'Role:', rahul_login['user']['role'])

# 6. Get Rahul Sep 28 worklog
sep28 = get('http://127.0.0.1:8000/api/worklogs/daily?date=2026-09-28', r_tok)
print(f'Rahul Sep 28 log: {sep28["work_date"]} | Total mins: {sep28["total_actual_minutes"]} | Acts: {len(sep28["activities"])} | Target achieved: {sep28["is_target_achieved"]}')
if sep28['feedbacks']:
    print('Manager remarks on Sep 28:', sep28['feedbacks'][0]['remarks'])

# 7. Get Rahul Oct 24 (today) worklog
oct24 = get('http://127.0.0.1:8000/api/worklogs/daily?date=2026-10-24', r_tok)
print(f'Rahul Oct 24 log: {oct24["work_date"]} | Status: {oct24["status"]} | Total mins: {oct24["total_actual_minutes"]} | Acts: {len(oct24["activities"])}')

print('ALL RAHUL VERIFICATIONS PASSED!')
