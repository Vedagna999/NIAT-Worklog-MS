import unittest
from datetime import date, datetime, timedelta, timezone, time
import uuid
import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, UserRole, DailyWorklog, WorklogActivity, ActivityCategory, WorklogStatus, TaskPriority, TaskStatus
from app.auth import create_access_token

class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Fetch seeded users
        cls.admin = cls.db.query(User).filter(User.email == "admin@niat.edu").first()
        cls.manager1 = cls.db.query(User).filter(User.email == "manager1@niat.edu").first()
        cls.manager2 = cls.db.query(User).filter(User.email == "manager2@niat.edu").first()
        cls.mentor1 = cls.db.query(User).filter(User.email == "mentor1@niat.edu").first() # assigned to mgr1
        cls.mentor4 = cls.db.query(User).filter(User.email == "mentor4@niat.edu").first() # assigned to mgr2

        cls.admin_token = create_access_token({"sub": str(cls.admin.id), "role": cls.admin.role.value})
        cls.mgr1_token = create_access_token({"sub": str(cls.manager1.id), "role": cls.manager1.role.value})
        cls.mgr2_token = create_access_token({"sub": str(cls.manager2.id), "role": cls.manager2.role.value})
        cls.mentor1_token = create_access_token({"sub": str(cls.mentor1.id), "role": cls.mentor1.role.value})
        cls.mentor4_token = create_access_token({"sub": str(cls.mentor4.id), "role": cls.mentor4.role.value})

        cls.category = cls.db.query(ActivityCategory).first()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "healthy")

    def test_02_login_success_and_failure(self):
        # Valid login
        resp = self.client.post("/api/auth/login", json={"email": "mentor1@niat.edu", "password": "mentor123"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "MENTOR")

        # Invalid password
        resp_bad = self.client.post("/api/auth/login", json={"email": "mentor1@niat.edu", "password": "wrongpassword"})
        self.assertEqual(resp_bad.status_code, 401)

    def test_03_mentor_can_only_access_own_worklog(self):
        # Mentor 1 queries own worklog
        today = date.today().isoformat()
        resp = self.client.get(
            f"/api/worklogs/daily?date={today}",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["mentor_id"], str(self.mentor1.id))
        self.assertIn("kpi_summary", data)

    def test_04_manager_assignment_access_control(self):
        # Manager 1 querying Mentor 1 (assigned to Mgr 1) -> SUCCESS (200)
        resp = self.client.get(
            f"/api/manager/dashboard?mentor_id={self.mentor1.id}",
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["selected_mentor"]["email"], "mentor1@niat.edu")

        # Manager 1 querying Mentor 4 (assigned to Mgr 2) -> FORBIDDEN (403)
        resp_denied = self.client.get(
            f"/api/manager/dashboard?mentor_id={self.mentor4.id}",
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp_denied.status_code, 403)
        self.assertIn("not assigned to you", resp_denied.json()["detail"])

        # Admin querying Mentor 4 -> SUCCESS (Admin has cross-manager privilege)
        resp_admin = self.client.get(
            f"/api/manager/dashboard?mentor_id={self.mentor4.id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp_admin.status_code, 200)

    def test_05_anti_overlap_constraint(self):
        # Mentor 1 attempts to add an activity that overlaps with an existing activity
        today = date.today()
        base_start = datetime.combine(today, time(9, 30)).replace(tzinfo=timezone.utc).isoformat()
        base_end = datetime.combine(today, time(10, 30)).replace(tzinfo=timezone.utc).isoformat()
        self.client.post(
            "/api/worklogs/activities",
            json={
                "category_id": str(self.category.id),
                "task_name": "Base Slot",
                "task_description": "First slot",
                "outcome": "Done",
                "priority": "HIGH",
                "status": "COMPLETED",
                "start_time": base_start,
                "end_time": base_end
            },
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )

        overlap_start = datetime.combine(today, time(10, 0)).replace(tzinfo=timezone.utc).isoformat()
        overlap_end = datetime.combine(today, time(11, 0)).replace(tzinfo=timezone.utc).isoformat()

        payload = {
            "category_id": str(self.category.id),
            "task_name": "Overlapping Task Attempt",
            "task_description": "Should fail due to overlap",
            "outcome": "None",
            "priority": "HIGH",
            "status": "COMPLETED",
            "start_time": overlap_start,
            "end_time": overlap_end
        }
        resp = self.client.post(
            "/api/worklogs/activities",
            json=payload,
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Time interval overlaps with existing task", resp.json()["detail"])

    def test_06_end_time_before_start_time_fails(self):
        today = date.today()
        bad_start = datetime.combine(today, time(19, 0)).replace(tzinfo=timezone.utc).isoformat()
        bad_end = datetime.combine(today, time(18, 0)).replace(tzinfo=timezone.utc).isoformat()

        payload = {
            "category_id": str(self.category.id),
            "task_name": "Invalid Time Order",
            "priority": "MEDIUM",
            "status": "COMPLETED",
            "start_time": bad_start,
            "end_time": bad_end
        }
        resp = self.client.post(
            "/api/worklogs/activities",
            json=payload,
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("End time must be strictly after start time", resp.json()["detail"])

    def test_07_manager_feedback_submission(self):
        today = date.today()
        # Find worklog of mentor1 for today
        worklog = self.db.query(DailyWorklog).filter(
            DailyWorklog.mentor_id == self.mentor1.id,
            DailyWorklog.work_date == today
        ).first()
        self.assertIsNotNone(worklog)

        resp = self.client.post(
            f"/api/manager/worklogs/{worklog.id}/feedback",
            json={"remarks": "Great work on mentoring session today!"},
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["remarks"], "Great work on mentoring session today!")
        self.assertIn("created_at", data)
        self.assertTrue(data["created_at"].endswith("Z") or "+00:00" in data["created_at"])

    def test_08_admin_reopen_locked_log(self):
        today = date.today()
        worklog = self.db.query(DailyWorklog).filter(
            DailyWorklog.mentor_id == self.mentor1.id,
            DailyWorklog.work_date == today
        ).first()

        # Temporarily mark as LOCKED
        worklog.status = WorklogStatus.LOCKED
        self.db.commit()

        # Mentor tries to edit while locked -> 403
        resp_mentor = self.client.post(
            f"/api/worklogs/daily/status?date={today.isoformat()}",
            json={"status": "SUBMITTED"},
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp_mentor.status_code, 403)
        self.assertIn("LOCKED", resp_mentor.json()["detail"])

        # Admin reopens log -> SUCCESS
        resp_admin = self.client.post(
            f"/api/admin/worklogs/{worklog.id}/reopen",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp_admin.status_code, 200)
        self.assertEqual(resp_admin.json()["status"], "DRAFT")

    def test_09_time_frame_preservation(self):
        # Clean up any previous test run on this date
        target_date = "2026-10-25"
        self.db.query(WorklogActivity).filter(WorklogActivity.start_time.like(f"{target_date}%")).delete()
        self.db.commit()

        # Verify that entering 09:00 to 11:00 does not shift hours
        payload = {
            "category_id": str(self.category.id),
            "task_name": "Standup Meeting",
            "task_description": "Morning team meeting",
            "outcome": "Aligned on tasks",
            "priority": "MEDIUM",
            "status": "COMPLETED",
            "start_time": f"{target_date}T09:00:00",
            "end_time": f"{target_date}T11:00:00"
        }
        resp = self.client.post(
            f"/api/worklogs/activities?date={target_date}",
            json=payload,
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("09:00:00", data["start_time"])
        self.assertIn("11:00:00", data["end_time"])
        self.assertEqual(data["actual_minutes"], 120)

    def test_10_missing_and_monthly_endpoints(self):
        # Mentor monthly calendar endpoint
        resp_m = self.client.get(
            "/api/worklogs/monthly?month=2026-10",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp_m.status_code, 200)
        days = resp_m.json()
        self.assertEqual(len(days), 31) # October has 31 days

        # Manager monthly calendar endpoint
        resp_mgr = self.client.get(
            f"/api/manager/monthly?mentor_id={self.mentor1.id}&month=2026-10",
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp_mgr.status_code, 200)
        self.assertEqual(len(resp_mgr.json()), 31)

        # Days before Oct 11 must have is_missing=False and is_not_available=True (unless logged)
        for day in days:
            if day["work_date"] < "2026-10-11":
                self.assertFalse(day["is_missing"], f"Day {day['work_date']} before Oct 11 should not be missing")
                if day["total_minutes"] == 0:
                    self.assertTrue(day.get("is_not_available", False))

        # Missing worklogs endpoint
        resp_miss = self.client.get(
            "/api/worklogs/missing",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp_miss.status_code, 200)
        missing_list = resp_miss.json()
        self.assertIsInstance(missing_list, list)
        for item in missing_list:
            self.assertGreaterEqual(
                item["work_date"],
                "2026-10-11",
                f"Missing item {item['work_date']} should not be prior to 11 Oct"
            )

    def test_11_manager_direct_feedback_and_rbac(self):
        # Manager 1 submits feedback via direct endpoint for a date without existing worklog
        future_date = "2026-11-15"
        resp = self.client.post(
            "/api/manager/feedback",
            json={
                "mentor_id": str(self.mentor1.id),
                "work_date": future_date,
                "remarks": "Please prepare ahead for next week review."
            },
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        fb_data = resp.json()
        self.assertEqual(fb_data["remarks"], "Please prepare ahead for next week review.")

        # Manager 2 submitting feedback for Mentor 1 (not assigned to Mgr 2) -> 403 Forbidden
        resp_unauth = self.client.post(
            "/api/manager/feedback",
            json={
                "mentor_id": str(self.mentor1.id),
                "work_date": future_date,
                "remarks": "Unauthorized attempt."
            },
            headers={"Authorization": f"Bearer {self.mgr2_token}"}
        )
        self.assertEqual(resp_unauth.status_code, 403)

        # Manager 2 submitting feedback for Mentor 4 (assigned to Mgr 2) -> 200 OK
        resp_mgr2 = self.client.post(
            "/api/manager/feedback",
            json={
                "mentor_id": str(self.mentor4.id),
                "work_date": future_date,
                "remarks": "Solid performance this sprint Sneha!"
            },
            headers={"Authorization": f"Bearer {self.mgr2_token}"}
        )
        self.assertEqual(resp_mgr2.status_code, 200)

        # Mentor 1 queries daily worklog for today and verifies feedbacks are included
        today_iso = date.today().isoformat()
        resp_mentor = self.client.get(
            f"/api/worklogs/daily?date={today_iso}",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp_mentor.status_code, 200)
        m_worklog = resp_mentor.json()
        self.assertIn("feedbacks", m_worklog)
        self.assertGreaterEqual(len(m_worklog["feedbacks"]), 1)

    def test_12_manager_analytics_overview(self):
        # 1. Manager 1 fetches analytics for assigned mentor (mentor1) for this month
        resp = self.client.get(
            f"/api/manager/analytics?mentor_id={self.mentor1.id}&period=month",
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check required fields
        self.assertEqual(data["mentor_id"], str(self.mentor1.id))
        self.assertEqual(data["mentor_name"], self.mentor1.full_name)
        self.assertEqual(data["period"], "month")
        self.assertIn("total_actual_minutes", data)
        self.assertIn("learning_minutes", data)
        self.assertIn("learning_summary", data)
        self.assertIn("topics_learned", data)
        self.assertIn("practical_outcomes", data)
        self.assertIn("weekly_learning_trend", data)
        self.assertIn("category_distribution", data)
        self.assertIn("exceptions", data)

        # Check that learning topics contain actual recorded data
        self.assertGreater(len(data["topics_learned"]), 0)
        first_topic = data["topics_learned"][0]
        self.assertIn("topic", first_topic)
        self.assertIn("total_minutes", first_topic)
        self.assertIn("most_recent_date", first_topic)

        # 2. Access control: Manager 2 attempting to view Mentor 1 (not assigned) -> 403 Forbidden
        resp_forbidden = self.client.get(
            f"/api/manager/analytics?mentor_id={self.mentor1.id}&period=month",
            headers={"Authorization": f"Bearer {self.mgr2_token}"}
        )
        self.assertEqual(resp_forbidden.status_code, 403)

        # 3. Admin can access any mentor
        resp_admin = self.client.get(
            f"/api/manager/analytics?mentor_id={self.mentor1.id}&period=week",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(resp_admin.status_code, 200)
        self.assertEqual(resp_admin.json()["period"], "week")

    def test_13_mentor_skill_finder(self):
        # 1. Manager 1 searching for "Database"
        resp = self.client.get(
            "/api/manager/skill-finder?q=Database",
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["query"], "Database")
        self.assertGreater(data["total_matching_mentors"], 0)
        self.assertGreater(data["total_matching_activities"], 0)
        
        # Verify evidence classification is present
        first_mentor = data["mentors"][0]
        self.assertIn("activities", first_mentor)
        act = first_mentor["activities"][0]
        self.assertIn(act["evidence_type"], ["LEARNING", "PRACTICE", "TEACHING_EXPERIENCE", "RELATED"])
        self.assertIsNotNone(act["worklog_id"])

        # 2. Mentor forbidden from calling skill-finder
        resp_forbidden = self.client.get(
            "/api/manager/skill-finder?q=Python",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp_forbidden.status_code, 403)

        # 3. Manager 2 cannot search with mentor_id of Mentor 1 (unassigned)
        resp_unassigned = self.client.get(
            f"/api/manager/skill-finder?q=Python&mentor_id={self.mentor1.id}",
            headers={"Authorization": f"Bearer {self.mgr2_token}"}
        )
        self.assertEqual(resp_unassigned.status_code, 403)


if __name__ == "__main__":
    unittest.main()
