import os
import sys
import unittest
from datetime import date, datetime

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, UserRole, MentorSkill, SkillGrowthLog, SkillCategoryType, SkillStatus
from app.auth import create_access_token

class TestSkillsPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Users
        cls.manager1 = cls.db.query(User).filter(User.email == "manager1@niat.edu").first()
        cls.manager2 = cls.db.query(User).filter(User.email == "manager2@niat.edu").first()
        cls.mentor1 = cls.db.query(User).filter(User.email == "mentor1@niat.edu").first()  # Assigned to manager1
        cls.mentor4 = cls.db.query(User).filter(User.email == "mentor4@niat.edu").first()  # Assigned to manager2

        cls.mgr1_token = create_access_token({"sub": str(cls.manager1.id), "role": cls.manager1.role.value})
        cls.mgr2_token = create_access_token({"sub": str(cls.manager2.id), "role": cls.manager2.role.value})
        cls.mentor1_token = create_access_token({"sub": str(cls.mentor1.id), "role": cls.mentor1.role.value})

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_predefined_skills(self):
        resp = self.client.get("/api/skills/predefined")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("technical", data)
        self.assertIn("non_technical", data)
        self.assertIn("Python", data["technical"])
        self.assertIn("React", data["technical"])
        self.assertIn("Mentoring & Coaching", data["non_technical"])

    def test_02_mentor_get_my_skills(self):
        resp = self.client.get(
            "/api/skills/me",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["mentor_email"], "mentor1@niat.edu")
        self.assertTrue(data["is_profile_completed"])
        self.assertGreater(data["total_skills"], 0)
        self.assertGreater(data["average_confidence"], 0)
        self.assertTrue(any(s["skill_name"] == "Python" for s in data["skills"]))

    def test_03_half_star_validation(self):
        # Adding a skill with invalid rating (not 0.5 increment, e.g. 3.7) should fail
        resp = self.client.post(
            "/api/skills/me",
            headers={"Authorization": f"Bearer {self.mentor1_token}"},
            json={
                "skill_name": "Invalid Rating Test Skill",
                "category_type": "TECHNICAL",
                "confidence_rating": 3.7,
                "status": "FAMILIAR"
            }
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("half-star increments", resp.json()["detail"])

    def test_04_add_and_update_skill(self):
        skill_name = "Docker & Containerization"
        # 1. Add skill
        add_resp = self.client.post(
            "/api/skills/me",
            headers={"Authorization": f"Bearer {self.mentor1_token}"},
            json={
                "skill_name": skill_name,
                "category_type": "TECHNICAL",
                "confidence_rating": 2.5,
                "status": "CURRENTLY_LEARNING",
                "notes": "Learning container images and multi-stage builds."
            }
        )
        self.assertEqual(add_resp.status_code, 200)
        skill_data = add_resp.json()
        skill_id = skill_data["id"]
        self.assertEqual(skill_data["confidence_rating"], 2.5)
        self.assertEqual(skill_data["status"], "CURRENTLY_LEARNING")
        self.assertEqual(len(skill_data["growth_logs"]), 1)

        # 2. Update skill rating to 3.5
        update_resp = self.client.put(
            f"/api/skills/me/{skill_id}",
            headers={"Authorization": f"Bearer {self.mentor1_token}"},
            json={
                "confidence_rating": 3.5,
                "status": "FAMILIAR",
                "notes": "Configured Docker compose for multi-container microservice."
            }
        )
        self.assertEqual(update_resp.status_code, 200)
        updated = update_resp.json()
        self.assertEqual(updated["confidence_rating"], 3.5)
        self.assertEqual(updated["status"], "FAMILIAR")
        # Should now have 2 growth logs
        self.assertEqual(len(updated["growth_logs"]), 2)
        self.assertEqual(updated["growth_logs"][0]["new_rating"], 3.5)
        self.assertEqual(updated["growth_logs"][0]["previous_rating"], 2.5)

        # 3. Clean up
        del_resp = self.client.delete(
            f"/api/skills/me/{skill_id}",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )
        self.assertEqual(del_resp.status_code, 200)

    def test_05_upskill_endpoint(self):
        upskill_resp = self.client.post(
            "/api/skills/me/upskill",
            headers={"Authorization": f"Bearer {self.mentor1_token}"},
            json={
                "skill_name": "GraphQL APIs",
                "category_type": "TECHNICAL",
                "confidence_rating": 3.0,
                "status": "CURRENTLY_LEARNING",
                "notes": "Implemented GraphQL schemas, resolvers and queries."
            }
        )
        self.assertEqual(upskill_resp.status_code, 200)
        data = upskill_resp.json()
        self.assertEqual(data["skill_name"], "GraphQL APIs")
        self.assertEqual(data["confidence_rating"], 3.0)

        # Clean up
        self.client.delete(
            f"/api/skills/me/{data['id']}",
            headers={"Authorization": f"Bearer {self.mentor1_token}"}
        )

    def test_06_manager_skills_dashboard_and_security(self):
        # Manager 1 can view mentor 1 (assigned)
        resp = self.client.get(
            f"/api/skills/manager/mentors/{self.mentor1.id}",
            headers={"Authorization": f"Bearer {self.mgr1_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["mentor_name"], self.mentor1.full_name)
        self.assertIn("summary", data)
        self.assertIn("skills", data)
        self.assertIn("recently_upskilled", data)
        self.assertIn("growth_timelines", data)
        self.assertGreater(len(data["skills"]), 0)
        self.assertGreater(len(data["recently_upskilled"]), 0)
        self.assertGreater(len(data["growth_timelines"]), 0)

        # Manager 2 tries to view mentor 1 (NOT assigned to manager 2) -> Should be 403 FORBIDDEN
        unauth_resp = self.client.get(
            f"/api/skills/manager/mentors/{self.mentor1.id}",
            headers={"Authorization": f"Bearer {self.mgr2_token}"}
        )
        self.assertEqual(unauth_resp.status_code, 403)
        self.assertIn("Access denied", unauth_resp.json()["detail"])

if __name__ == "__main__":
    unittest.main()
