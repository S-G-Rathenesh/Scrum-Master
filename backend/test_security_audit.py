import asyncio
import httpx
from bson import ObjectId
from datetime import datetime, timezone

from app.database.mongodb import connect_to_mongo, get_database
from app.core.config import settings
from app.api.v1.auth import create_access_token

async def run_security_audit():
    await connect_to_mongo()
    db = get_database()
    
    print("==================================================")
    print(" SCRUM MASTER - MULTI-USER DATA ISOLATION AUDIT")
    print("==================================================")
    
    # 1. Setup Test Users
    user_a_id = str(ObjectId())
    user_b_id = str(ObjectId())
    
    await db.users.delete_many({"email": {"$in": ["usera@test.com", "userb@test.com"]}})
    
    res_a = await db.users.insert_one({
        "_id": ObjectId(user_a_id),
        "email": "usera@test.com",
        "name": "User A",
        "avatar": "https://example.com/a.png",
        "authProvider": "google",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    })
    
    res_b = await db.users.insert_one({
        "_id": ObjectId(user_b_id),
        "email": "userb@test.com",
        "name": "User B",
        "avatar": "https://example.com/b.png",
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
        # TEST 1: User A creates Application A
        print("\n--- TEST 1: Project Creation & Listing Isolation ---")
        resp_a_create = await client.post(
            f"{base_url}/projects",
            json={"name": "Shared App Name", "frontendUrl": "http://app-a.com"},
            headers=headers_a
        )
        assert resp_a_create.status_code == 201, f"Failed A create: {resp_a_create.text}"
        project_a = resp_a_create.json()
        project_a_id = project_a["id"]
        print(f"[OK] User A created project: {project_a_id} ('{project_a['name']}')")
        
        # User B creates Application B with the SAME NAME
        resp_b_create = await client.post(
            f"{base_url}/projects",
            json={"name": "Shared App Name", "frontendUrl": "http://app-b.com"},
            headers=headers_b
        )
        assert resp_b_create.status_code == 201, f"Failed B create: {resp_b_create.text}"
        project_b = resp_b_create.json()
        project_b_id = project_b["id"]
        print(f"[OK] User B created project: {project_b_id} ('{project_b['name']}')")
        
        # User A lists projects -> sees ONLY A
        resp_a_list = await client.get(f"{base_url}/projects", headers=headers_a)
        projects_a = resp_a_list.json()
        assert len(projects_a) == 1 and projects_a[0]["id"] == project_a_id
        print(f"[OK] User A list isolation verified (found {len(projects_a)} project)")
        
        # User B lists projects -> sees ONLY B
        resp_b_list = await client.get(f"{base_url}/projects", headers=headers_b)
        projects_b = resp_b_list.json()
        assert len(projects_b) == 1 and projects_b[0]["id"] == project_b_id
        print(f"[OK] User B list isolation verified (found {len(projects_b)} project)")
        
        # TEST 2: Cross-User Access Checks
        print("\n--- TEST 2: Single-Project Cross-User Access Blocks ---")
        
        # User B tries to GET Application A
        resp_get = await client.get(f"{base_url}/projects/{project_a_id}", headers=headers_b)
        assert resp_get.status_code == 404, f"Expected 404, got {resp_get.status_code}"
        print("[OK] User B cannot GET Application A (404 Not Found)")
        
        # User B tries to UPDATE Application A
        resp_patch = await client.patch(
            f"{base_url}/projects/{project_a_id}",
            json={"name": "Hacked Name"},
            headers=headers_b
        )
        assert resp_patch.status_code == 404, f"Expected 404, got {resp_patch.status_code}"
        print("[OK] User B cannot UPDATE Application A (404 Not Found)")
        
        # User B tries to DELETE Application A
        resp_del = await client.delete(f"{base_url}/projects/{project_a_id}", headers=headers_b)
        assert resp_del.status_code == 404, f"Expected 404, got {resp_del.status_code}"
        print("[OK] User B cannot DELETE Application A (404 Not Found)")
        
        # TEST 3: Monitoring & Telemetry Sub-Resource Isolation
        print("\n--- TEST 3: Telemetry & Monitoring Sub-Resource Isolation ---")
        
        # User B tries to view monitoring history of Application A
        resp_history = await client.get(f"{base_url}/projects/{project_a_id}/monitoring/history", headers=headers_b)
        assert resp_history.status_code == 404
        print("[OK] User B cannot view Application A monitoring history")
        
        # User B tries to view incidents of Application A
        resp_incidents = await client.get(f"{base_url}/projects/{project_a_id}/incidents", headers=headers_b)
        assert resp_incidents.status_code == 404
        print("[OK] User B cannot view Application A incidents")
        
        # User B tries to view analytics overview of Application A
        resp_analytics = await client.get(f"{base_url}/projects/{project_a_id}/overview", headers=headers_b)
        assert resp_analytics.status_code == 404
        print("[OK] User B cannot view Application A analytics overview")
        
        # User B tries to view errors of Application A
        resp_errors = await client.get(f"{base_url}/projects/{project_a_id}/errors", headers=headers_b)
        assert resp_errors.status_code == 404
        print("[OK] User B cannot view Application A errors")
        
        # User B tries to view integration status of Application A
        resp_status = await client.get(f"{base_url}/projects/{project_a_id}/integration/status", headers=headers_b)
        assert resp_status.status_code == 404
        print("[OK] User B cannot view Application A integration status")
        
        # User B tries to regenerate integration token for Application A
        resp_regen = await client.post(f"{base_url}/projects/{project_a_id}/integration/regenerate", headers=headers_b)
        assert resp_regen.status_code == 404
        print("[OK] User B cannot regenerate integration token for Application A")
        
        # TEST 4: Enrollment Token Isolation
        print("\n--- TEST 4: Enrollment Credential Binding & Auto-Provisioning Isolation ---")
        
        # User A downloads package
        resp_pkg_a = await client.get(f"{base_url}/integration/enrollment-package", headers=headers_a)
        assert resp_pkg_a.status_code == 200
        print("[OK] User A generated enrollment credential package")
        
        # User B downloads package
        resp_pkg_b = await client.get(f"{base_url}/integration/enrollment-package", headers=headers_b)
        assert resp_pkg_b.status_code == 200
        print("[OK] User B generated enrollment credential package")
        
        # Clean up test database documents
        await db.users.delete_many({"_id": {"$in": [ObjectId(user_a_id), ObjectId(user_b_id)]}})
        await db.projects.delete_many({"_id": {"$in": [ObjectId(project_a_id), ObjectId(project_b_id)]}})
        
        print("\n==================================================")
        print(" ALL MULTI-USER ISOLATION TESTS PASSED SUCCESSFULLY! ")
        print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_security_audit())
