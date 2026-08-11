import asyncio
import httpx
from datetime import datetime, timezone
from bson import ObjectId
from app.database.mongodb import get_database, connect_to_mongo
from app.core.security import create_access_token
from app.schemas.project import ProjectCreate, ProjectStatus, IntegrationStatus

async def run_tests():
    print("=" * 50)
    print(" SCRUM MASTER - MEMBERS & REPLY FEATURE TESTS")
    print("=" * 50)

    await connect_to_mongo()
    db = get_database()
    base_url = "http://127.0.0.1:8000/api/v1"

    # Setup User A and User B
    user_a_id = str(ObjectId())
    user_b_id = str(ObjectId())

    await db.users.delete_many({"email": {"$in": ["manager.a@example.com", "manager.b@example.com"]}})
    await db.users.insert_one({
        "_id": ObjectId(user_a_id),
        "email": "manager.a@example.com",
        "name": "Manager A",
        "authProvider": "google",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    })
    await db.users.insert_one({
        "_id": ObjectId(user_b_id),
        "email": "manager.b@example.com",
        "name": "Manager B",
        "authProvider": "google",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    })

    token_a = create_access_token(subject=user_a_id)
    token_b = create_access_token(subject=user_b_id)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    async with httpx.AsyncClient() as client:
        # TEST 1: Create Project A for User A & Project B for User B
        resp_p_a = await client.post(f"{base_url}/projects", headers=headers_a, json={"name": "App A"})
        if resp_p_a.status_code != 201:
            print("P_A ERR:", resp_p_a.status_code, resp_p_a.text)
        assert resp_p_a.status_code == 201
        proj_a_id = resp_p_a.json()["id"]

        resp_p_b = await client.post(f"{base_url}/projects", headers=headers_b, json={"name": "App B"})
        assert resp_p_b.status_code == 201
        proj_b_id = resp_p_b.json()["id"]

        print("[OK] Test 1: Project A and Project B created")

        # TEST 2: Feedback Creation & Reply
        resp_fb = await client.post(
            f"{base_url}/projects/{proj_a_id}/feedback",
            headers=headers_a,
            json={"message": "Need help with integration", "email": "client@example.com"}
        )
        assert resp_fb.status_code == 200
        fb_id = resp_fb.json()["feedbackId"]

        # Manager A replies to Feedback
        resp_reply = await client.patch(
            f"{base_url}/projects/{proj_a_id}/feedback/{fb_id}",
            headers=headers_a,
            json={"reply": "Thanks for reporting. This is now fixed in v1.2.0."}
        )
        assert resp_reply.status_code == 200

        # Verify feedback detail has reply and status RESOLVED
        resp_detail = await client.get(f"{base_url}/projects/{proj_a_id}/feedback/{fb_id}", headers=headers_a)
        assert resp_detail.status_code == 200
        fb_data = resp_detail.json()
        assert fb_data["reply"] == "Thanks for reporting. This is now fixed in v1.2.0."
        assert fb_data["status"] == "RESOLVED"
        assert "repliedAt" in fb_data
        print("[OK] Test 2: Manager reply to feedback succeeded with status RESOLVED")

        # TEST 3: User B CANNOT reply to User A's feedback
        resp_b_reply = await client.patch(
            f"{base_url}/projects/{proj_a_id}/feedback/{fb_id}",
            headers=headers_b,
            json={"reply": "Malicious reply attempt"}
        )
        assert resp_b_reply.status_code == 404
        print("[OK] Test 3: User B CANNOT reply to User A's feedback (404 Not Found)")

        # TEST 4: Members API - List initial members (Includes Owner)
        resp_m_a = await client.get(f"{base_url}/projects/{proj_a_id}/members", headers=headers_a)
        assert resp_m_a.status_code == 200
        members_a = resp_m_a.json()
        assert len(members_a) == 1
        assert members_a[0]["accessLevel"] == "OWNER"
        print("[OK] Test 4: Project members list returns owner entry")

        # TEST 5: Members API - Add new Member
        resp_add = await client.post(
            f"{base_url}/projects/{proj_a_id}/members",
            headers=headers_a,
            json={"email": "developer@example.com", "accessLevel": "DEVELOPER"}
        )
        assert resp_add.status_code == 201
        new_member = resp_add.json()
        assert new_member["email"] == "developer@example.com"
        assert new_member["accessLevel"] == "DEVELOPER"
        member_id = new_member["id"]
        print("[OK] Test 5: Member added successfully to Project A")

        # TEST 6: User B CANNOT view User A's members
        resp_b_m = await client.get(f"{base_url}/projects/{proj_a_id}/members", headers=headers_b)
        assert resp_b_m.status_code == 404
        print("[OK] Test 6: User B CANNOT view User A's members (404 Not Found)")

        # TEST 7: User B CANNOT add member to User A's project
        resp_b_add = await client.post(
            f"{base_url}/projects/{proj_a_id}/members",
            headers=headers_b,
            json={"email": "attacker@example.com", "accessLevel": "ADMIN"}
        )
        assert resp_b_add.status_code == 404
        print("[OK] Test 7: User B CANNOT grant access to User A's project (404 Not Found)")

        # TEST 8: Revoke Member
        resp_del = await client.delete(f"{base_url}/projects/{proj_a_id}/members/{member_id}", headers=headers_a)
        assert resp_del.status_code == 204

        # Verify member list length back to 1
        resp_m_a_after = await client.get(f"{base_url}/projects/{proj_a_id}/members", headers=headers_a)
        assert len(resp_m_a_after.json()) == 1
        print("[OK] Test 8: Member revoked successfully from Project A")

    print("\n" + "=" * 50)
    print(" ALL MEMBERS & REPLY TESTS PASSED SUCCESSFULLY! ")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(run_tests())
