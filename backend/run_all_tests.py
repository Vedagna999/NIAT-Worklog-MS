import sys
import os
import json
import urllib.request
import urllib.error
from datetime import date, datetime, timedelta, timezone

# Target URL: Live Render backend or local
TARGET_URL = os.getenv("API_URL", "https://niat-worklog-ms-backend.onrender.com").rstrip("/")
print(f"================================================================")
print(f"  RUNNING COMPREHENSIVE TEST SUITE ON: {TARGET_URL}")
print(f"================================================================\n")

test_results = []

def record(test_name: str, passed: bool, details: str = ""):
    status_str = "PASS" if passed else "FAIL"
    icon = "[OK]" if passed else "[FAIL]"
    print(f" {icon} {test_name}: {status_str} {details}")
    test_results.append({"name": test_name, "passed": passed, "details": details})

def request_json(path, method="GET", body=None, token=None):
    url = f"{TARGET_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            body_json = json.loads(content)
        except Exception:
            body_json = {"detail": content}
        return e.code, body_json
    except Exception as e:
        return 0, {"detail": str(e)}

# ---------------------------------------------------------------------------
# SUITE 1: System Health & MongoDB Connection
# ---------------------------------------------------------------------------
print("--> SUITE 1: System Health & Database Connectivity")
status, data = request_json("/api/health")
health_ok = status == 200 and data.get("status") == "healthy"
record("1.1 Health Check Status 200", health_ok, f"(status={status})")

mongo_info = data.get("mongodb", {})
mongo_connected = mongo_info.get("status") == "connected"
record("1.2 MongoDB Atlas Connected", mongo_connected, f"(cluster={mongo_info.get('cluster', 'N/A')})")

counts = mongo_info.get("counts", {})
counts_ok = counts.get("users", 0) > 0 and counts.get("daily_worklogs", 0) > 0
record("1.3 MongoDB Collections Populated", counts_ok, f"({counts.get('users')} users, {counts.get('daily_worklogs')} worklogs, {counts.get('worklog_activities')} activities)")

# ---------------------------------------------------------------------------
# SUITE 2: Authentication & RBAC Access Control
# ---------------------------------------------------------------------------
print("\n--> SUITE 2: Authentication & Access Control (JWT / RBAC)")
# Valid Mentor Login
status, data = request_json("/api/auth/login", method="POST", body={"email": "tharun@niat.edu", "password": "password123"})
mentor_token = data.get("access_token")
mentor_id = data.get("user", {}).get("id")
record("2.1 Mentor Login Success", status == 200 and bool(mentor_token), f"(User: Tharun, Role: {data.get('user', {}).get('role')})")

# Valid Manager Login
status, data = request_json("/api/auth/login", method="POST", body={"email": "kushal@niat.edu", "password": "password123"})
mgr_token = data.get("access_token")
mgr_id = data.get("user", {}).get("id")
record("2.2 Manager Login Success", status == 200 and bool(mgr_token), f"(User: Kushal, Role: {data.get('user', {}).get('role')})")

# Valid Admin Login
status, data = request_json("/api/auth/login", method="POST", body={"email": "admin@niat.edu", "password": "admin123"})
admin_token = data.get("access_token")
record("2.3 Admin Login Success", status == 200 and bool(admin_token), f"(Role: {data.get('user', {}).get('role')})")

# Invalid Password Rejected
status, data = request_json("/api/auth/login", method="POST", body={"email": "tharun@niat.edu", "password": "wrong_password_xyz"})
record("2.4 Invalid Password Rejected (401)", status == 401, f"(status={status})")

# Invalid Token Rejected
status, data = request_json("/api/auth/me", method="GET", token="invalid.token.here")
record("2.5 Invalid Token Rejected (401)", status == 401, f"(status={status})")

# ---------------------------------------------------------------------------
# SUITE 3: Mentor Daily Worklog & Activity Operations
# ---------------------------------------------------------------------------
print("\n--> SUITE 3: Daily Worklog & Validation Constraints")
today_str = date.today().isoformat()
status, worklog = request_json(f"/api/worklogs/daily?date={today_str}", method="GET", token=mentor_token)
record("3.1 Query Daily Worklog", status == 200 and "activities" in worklog, f"(Total actual minutes today: {worklog.get('total_actual_minutes', 0)})")

# Fetch categories
status, categories = request_json("/api/categories", method="GET", token=mentor_token)
cat_id = categories[0]["id"] if categories else None
record("3.2 Fetch Activity Categories", status == 200 and len(categories) > 0, f"({len(categories)} categories available)")

# Add a test activity (use tomorrow's date to avoid conflicting with actual live logs)
test_date = (date.today() + timedelta(days=1)).isoformat()
test_start = f"{test_date}T10:00:00"
test_end = f"{test_date}T11:00:00"
status, new_act = request_json(f"/api/worklogs/activities?date={test_date}", method="POST", token=mentor_token, body={
    "category_id": cat_id,
    "task_name": "Automated Test Task Session",
    "task_description": "Validating worklog activity entry",
    "outcome": "Verification complete",
    "priority": "MEDIUM",
    "status": "COMPLETED",
    "start_time": test_start,
    "end_time": test_end
})
act_id = new_act.get("id")
record("3.3 Create Worklog Activity", status == 200 and bool(act_id), f"(Duration: {new_act.get('actual_minutes')} mins, ID: {act_id})")

# Anti-Overlap Validation: Attempt overlapping slot on the same day
overlap_start = f"{test_date}T10:30:00"
overlap_end = f"{test_date}T11:30:00"
status, overlap_res = request_json(f"/api/worklogs/activities?date={test_date}", method="POST", token=mentor_token, body={
    "category_id": cat_id,
    "task_name": "Overlapping Task (Should Fail)",
    "priority": "HIGH",
    "status": "COMPLETED",
    "start_time": overlap_start,
    "end_time": overlap_end
})
record("3.4 Anti-Overlap Constraint Blocked (400)", status == 400 and "overlap" in overlap_res.get("detail", "").lower(), f"(detail='{overlap_res.get('detail')}')")

# End-time before start-time validation
bad_start = f"{test_date}T14:00:00"
bad_end = f"{test_date}T13:00:00"
status, bad_time_res = request_json(f"/api/worklogs/activities?date={test_date}", method="POST", token=mentor_token, body={
    "category_id": cat_id,
    "task_name": "Backwards Time (Should Fail)",
    "priority": "LOW",
    "status": "COMPLETED",
    "start_time": bad_start,
    "end_time": bad_end
})
record("3.5 Inverted Time Rejected (400)", status == 400 and "strictly after" in bad_time_res.get("detail", "").lower(), f"(detail='{bad_time_res.get('detail')}')")

# Clean up created activity
if act_id:
    status, _ = request_json(f"/api/worklogs/activities/{act_id}", method="DELETE", token=mentor_token)
    record("3.6 Delete Activity Clean Up", status == 200, "")

# ---------------------------------------------------------------------------
# SUITE 4: Manager Portal & Assigned Cohort Security
# ---------------------------------------------------------------------------
print("\n--> SUITE 4: Manager Portal & Access Control")
status, roster = request_json("/api/manager/mentors", method="GET", token=mgr_token)
record("4.1 Manager Roster Query", status == 200 and len(roster) > 0, f"({len(roster)} mentors assigned to Kushal)")

# Check that Tharun is assigned to Kushal
tharun_in_roster = any(m.get("email") == "tharun@niat.edu" for m in roster)
record("4.2 Assigned Mentor Verification", tharun_in_roster, "(Tharun present in Kushal's roster)")

# Manager viewing assigned mentor's dashboard -> 200
status, mgr_dash = request_json(f"/api/manager/dashboard?mentor_id={mentor_id}", method="GET", token=mgr_token)
record("4.3 Authorized Mentor Inspection", status == 200 and "selected_mentor" in mgr_dash, "")

# Submitting Manager Feedback Remarks
status, feedback_res = request_json(f"/api/manager/worklogs/{worklog.get('id')}/feedback", method="POST", token=mgr_token, body={
    "remarks": "Automated verification feedback - great compliance!"
})
record("4.4 Manager Feedback Submission", status == 200 and bool(feedback_res.get("id")), f"(Remarks saved: '{feedback_res.get('remarks')}')")

# ---------------------------------------------------------------------------
# SUITE 5: Mentor Skills & Growth Platform
# ---------------------------------------------------------------------------
print("\n--> SUITE 5: Mentor Skills & Growth Platform")
# 5.1 Predefined Skills
status, predefined = request_json("/api/skills/predefined", method="GET")
predefined_ok = status == 200 and len(predefined.get("technical", [])) >= 30 and len(predefined.get("non_technical", [])) >= 5
record("5.1 Predefined Skills Repository", predefined_ok, f"({len(predefined.get('technical', []))} technical, {len(predefined.get('non_technical', []))} non-technical)")

# 5.2 Mentor's Skills Profile
status, my_skills = request_json("/api/skills/me", method="GET", token=mentor_token)
record("5.2 Mentor Skills Profile Query", status == 200 and my_skills.get("total_skills", 0) > 0, f"(Total skills: {my_skills.get('total_skills')}, Avg Confidence: {my_skills.get('average_confidence')} stars)")

# 5.3 Half-Star Validation: Reject 3.7
status, bad_star_res = request_json("/api/skills/me", method="POST", token=mentor_token, body={
    "skill_name": "Test Invalid Star Skill",
    "category_type": "TECHNICAL",
    "confidence_rating": 3.7,
    "status": "FAMILIAR"
})
record("5.3 Half-Star Rating Enforcement (400)", status == 400 and "half-star" in bad_star_res.get("detail", "").lower(), f"(detail='{bad_star_res.get('detail')}')")

# 5.4 Add New Skill (Half-Star: 3.5)
status, added_skill = request_json("/api/skills/me", method="POST", token=mentor_token, body={
    "skill_name": "Kubernetes Orchestration",
    "category_type": "TECHNICAL",
    "confidence_rating": 3.5,
    "status": "CURRENTLY_LEARNING",
    "notes": "Deploying containerized microservices and pods"
})
skill_id = added_skill.get("id")
record("5.4 Add New Skill with 3.5 Stars", status == 200 and bool(skill_id), f"(Created: {added_skill.get('skill_name')}, Rating: {added_skill.get('confidence_rating')} stars)")

# 5.5 Update Skill Rating & Growth Log (Increase to 4.5 Stars)
status, updated_skill = request_json(f"/api/skills/me/{skill_id}", method="PUT", token=mentor_token, body={
    "confidence_rating": 4.5,
    "status": "PROFICIENT",
    "notes": "Configured Ingress controllers and horizontal pod autoscaling"
})
growth_logs = updated_skill.get("growth_logs", [])
growth_ok = status == 200 and updated_skill.get("confidence_rating") == 4.5 and len(growth_logs) >= 2
record("5.5 Update Confidence Rating (3.5 -> 4.5 stars) & Audit Log", growth_ok, f"(Current: 4.5 stars, Growth log count: {len(growth_logs)})")

# 5.6 Upskill Endpoint
status, upskilled = request_json("/api/skills/me/upskill", method="POST", token=mentor_token, body={
    "skill_id": skill_id,
    "confidence_rating": 5.0,
    "status": "PROFICIENT",
    "notes": "Mastered production Kubernetes cluster management"
})
record("5.6 Log Upskilling Milestone via Worklog Endpoint", status == 200 and upskilled.get("confidence_rating") == 5.0, f"(New rating: 5.0 stars)")

# 5.7 Clean up test skill
status, _ = request_json(f"/api/skills/me/{skill_id}", method="DELETE", token=mentor_token)
record("5.7 Delete Skill Clean Up", status == 200, "")

# 5.8 Manager Skills & Growth Dashboard
status, mgr_skills_view = request_json(f"/api/skills/manager/mentors/{mentor_id}", method="GET", token=mgr_token)
mgr_skills_ok = (
    status == 200
    and len(mgr_skills_view.get("skills", [])) > 0
    and len(mgr_skills_view.get("recently_upskilled", [])) > 0
    and len(mgr_skills_view.get("growth_timelines", [])) > 0
)
record("5.8 Manager Skills & Growth Overview View", mgr_skills_ok, f"({len(mgr_skills_view.get('skills', []))} skills, {len(mgr_skills_view.get('recently_upskilled', []))} upskilled items, {len(mgr_skills_view.get('growth_timelines', []))} timelines)")

# ---------------------------------------------------------------------------
# SUITE 6: Skill Finder Search & Analytics
# ---------------------------------------------------------------------------
print("\n--> SUITE 6: Skill Finder & Search Capabilities")
status, search_res = request_json("/api/manager/skill-finder?q=Python", method="GET", token=mgr_token)
search_ok = status == 200 and search_res.get("total_matching_mentors", 0) > 0
record("6.1 Search Skill Finder for 'Python'", search_ok, f"(Found {search_res.get('total_matching_mentors')} mentors with recorded Python activities)")

# ---------------------------------------------------------------------------
# FINAL REPORT
# ---------------------------------------------------------------------------
total_tests = len(test_results)
passed_tests = sum(1 for t in test_results if t["passed"])
failed_tests = total_tests - passed_tests

print("\n================================================================")
print(f"  TEST SUITE COMPLETED: {passed_tests}/{total_tests} PASSED ({failed_tests} FAILED)")
print("================================================================\n")

if failed_tests > 0:
    print("Failed Tests:")
    for t in test_results:
        if not t["passed"]:
            print(f" - {t['name']}: {t['details']}")
    sys.exit(1)
else:
    print("ALL TEST CASES PASSED WITH 100% SUCCESS RATE!")
    sys.exit(0)
