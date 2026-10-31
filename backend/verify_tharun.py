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
print('Assigned mentors to Kushal:', [m['full_name'] for m in roster])

# 3. Get team overview
team_ov = get('http://127.0.0.1:8000/api/manager/team-overview', k_tok)
print('Team Overview mentors count:', len(team_ov['mentors']))
for m in team_ov['mentors']:
    name = m['full_name']
    email = m['email']
    hrs = m['period_working_hours']
    days_met = m['days_meeting_target']
    total_days = m['days_logged']
    print(f' - {name} ({email}) | Worked: {hrs} | Target met: {days_met}/{total_days}')

# 4. Search Skill Finder for Node, MongoDB, Python, Bootstrap
for query in ['Node', 'MongoDB', 'Python', 'Bootstrap', 'Algebra']:
    res = get(f'http://127.0.0.1:8000/api/manager/skill-finder?q={query}', k_tok)
    matched_mentors = [m['mentor_name'] for m in res['mentors']]
    print(f'Skill search "{query}": {res["total_matching_activities"]} results | Mentors: {matched_mentors}')

# 5. Login as Tharun
tharun_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'tharun@niat.edu', 'password': 'password123'})
t_tok = tharun_login['access_token']
print('Tharun login OK:', tharun_login['user']['full_name'], 'Role:', tharun_login['user']['role'])

# 6. Get Tharun Oct 16 worklog
oct16 = get('http://127.0.0.1:8000/api/worklogs/daily?date=2026-10-16', t_tok)
print('Tharun Oct 16 log:', oct16['work_date'], '| Total mins:', oct16['total_actual_minutes'], '| Acts:', len(oct16['activities']), '| Target achieved:', oct16['is_target_achieved'])
if oct16['feedbacks']:
    print('Manager remarks on Oct 16:', oct16['feedbacks'][0]['remarks'])
