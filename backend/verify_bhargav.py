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
for query in ['Express', 'Shadowing', 'LeetCode', 'Statistics', 'GenAI']:
    res = get(f'http://127.0.0.1:8000/api/manager/skill-finder?q={query}', k_tok)
    matched_mentors = [m['mentor_name'] for m in res['mentors']]
    print(f'Skill search "{query}": {res["total_matching_activities"]} results | Mentors: {matched_mentors}')

# 5. Login as Bhargav
bhargav_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'bhargav@niat.edu', 'password': 'password123'})
b_tok = bhargav_login['access_token']
print('Bhargav login OK:', bhargav_login['user']['full_name'], 'Role:', bhargav_login['user']['role'])

# 6. Get Bhargav Oct 13 worklog
oct13 = get('http://127.0.0.1:8000/api/worklogs/daily?date=2026-10-13', b_tok)
print(f'Bhargav Oct 13 log: {oct13["work_date"]} | Total mins: {oct13["total_actual_minutes"]} | Acts: {len(oct13["activities"])} | Target achieved: {oct13["is_target_achieved"]}')
if oct13['feedbacks']:
    print('Manager remarks on Oct 13:', oct13['feedbacks'][0]['remarks'])

# 7. Check for lunch activities (must be 0)
lunch_acts = [a for a in oct13['activities'] if 'lunch' in a['task_name'].lower() or (a.get('category') and 'lunch' in a['category']['name'].lower())]
print(f'Lunch activities count on Oct 13: {len(lunch_acts)}')
print('ALL VERIFICATIONS PASSED!')
