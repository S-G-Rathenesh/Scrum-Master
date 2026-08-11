import asyncio
import httpx
from bson import ObjectId
from datetime import datetime, timezone

from app.database.mongodb import connect_to_mongo, get_database
from app.core.security import create_access_token
from app.services.enrollment_service import create_enrollment_credential

async def run_feedback_tests():
    await connect_to_mongo()
    db = get_database()
    
    print("==================================================")
    print(" SCRUM MASTER - CONTACT & FEEDBACK FEATURE TESTS")
    print("==================================================")
    
    # Setup test users
    user_a_id = str(ObjectId())
    user_b_id = str(ObjectId())
    
    await db.users.delete_many({"email": {"$in": ["fa@test.com", "fb@test.com"]}})
    await db.projects.delete_many({"ownerId": {"$in": [user_a_id, user_b_id]}})
    
    await db.users.insert_one({
        "_id": ObjectId(user_a_id),
        "email": "fa@test.com",
        "name": "User FA",
        "authProvider": "google",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    })
    
    await db.users.insert_one({
        "_id": ObjectId(user_b_id),
        "email": "fb@test.com",
        "name": "User FB",
        "authProvider": "google",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    })
    
    token_a = create_access_token(subject=user_a_id)
    token_b = create_access_token(subject=user_b_id)
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    base_url = "http://localhost:8000/api/v1"
    
    async with httpx.AsyncClient() as client:
        # TEST 1: User A creates project A
        resp_a_create = await client.post(
            f"{base_url}/projects",
            json={"name": "Application A"},
            headers=headers_a
        )
        assert resp_a_create.status_code == 201
        proj_a_id = resp_a_create.json()["id"]
        print("[OK] Test 1: User A project A created successfully")
        
        # User B creates project B
        resp_b_create = await client.post(
            f"{base_url}/projects",
            json={"name": "Application B"},
            headers=headers_b
        )
        assert resp_b_create.status_code == 201
        proj_b_id = resp_b_create.json()["id"]
        print("[OK] Test 1: User B project B created successfully")
        
        # Generate integration tokens for both
        resp_tok_a = await client.post(f"{base_url}/projects/{proj_a_id}/integration/generate", headers=headers_a)
        assert resp_tok_a.status_code == 200
        agent_token_a = resp_tok_a.json()["token"]
        
        resp_tok_b = await client.post(f"{base_url}/projects/{proj_b_id}/integration/generate", headers=headers_b)
        assert resp_tok_b.status_code == 200
        agent_token_b = resp_tok_b.json()["token"]
        
        # TEST 2: Agent Enrollment still works
        enroll_raw = await create_enrollment_credential(user_a_id)
        resp_enroll = await client.post(
            f"{base_url}/integration/enroll",
            headers={"Authorization": f"Bearer {enroll_raw}"},
            json={"application_name": "Agent Enrolled App A", "framework": "Express"}
        )
        assert resp_enroll.status_code == 200
        print("[OK] Test 2: Existing enrollment API still works")
        
        # TEST 3: Heartbeat still works
        resp_hb = await client.post(
            f"{base_url}/integration/heartbeat",
            headers={"Authorization": f"Bearer {agent_token_a}"},
            json={"agentVersion": "1.2.0"}
        )
        assert resp_hb.status_code == 200
        print("[OK] Test 3: Existing heartbeat API still works")
        
        # TEST 4: Telemetry still works
        resp_err = await client.post(
            f"{base_url}/integration/errors",
            headers={"Authorization": f"Bearer {agent_token_a}"},
            json={
                "errorType": "RuntimeError",
                "message": "Sample error event",
                "severity": "ERROR",
                "source": "backend"
            }
        )
        assert resp_err.status_code == 200
        print("[OK] Test 4: Existing telemetry error ingestion still works")
        
        # TEST 5: Integration Feedback Submission from Agent (Message-Only, No Email Required)
        resp_fb_a = await client.post(
            f"{base_url}/integration/feedback",
            headers={"Authorization": f"Bearer {agent_token_a}"},
            json={
                "message": "The checkout page takes 5 seconds to load.",
                "category": "BUG"
            }
        )
        assert resp_fb_a.status_code == 200
        fb_a_id = resp_fb_a.json()["feedbackId"]
        print(f"[OK] Test 5: Message-only Integration Feedback submission via agent token succeeded (ID: {fb_a_id})")
        
        # TEST 6: User A can see User A feedback
        resp_get_a_fb = await client.get(f"{base_url}/projects/{proj_a_id}/feedback", headers=headers_a)
        assert resp_get_a_fb.status_code == 200
        items_a = resp_get_a_fb.json()["items"]
        assert len(items_a) >= 1
        print("[OK] Test 6: User A can see User A's project feedback")
        
        # TEST 7: User B CANNOT see User A feedback
        resp_b_sneak = await client.get(f"{base_url}/projects/{proj_a_id}/feedback", headers=headers_b)
        assert resp_b_sneak.status_code == 404
        print("[OK] Test 7: User B CANNOT access User A's feedback (404 Not Found)")
        
        # TEST 8: User B CANNOT modify User A feedback
        resp_b_mod = await client.patch(
            f"{base_url}/projects/{proj_a_id}/feedback/{fb_a_id}",
            headers=headers_b,
            json={"status": "RESOLVED"}
        )
        assert resp_b_mod.status_code == 404
        print("[OK] Test 8: User B CANNOT modify User A's feedback (404 Not Found)")
        
        # Clean up
        await db.users.delete_many({"_id": {"$in": [ObjectId(user_a_id), ObjectId(user_b_id)]}})
        await db.projects.delete_many({"_id": {"$in": [ObjectId(proj_a_id), ObjectId(proj_b_id)]}})
        
        print("\n==================================================")
        print(" ALL CONTACT & FEEDBACK TESTS PASSED SUCCESSFULLY! ")
        print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_feedback_tests())
