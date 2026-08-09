import asyncio
import os
import httpx
from pydantic import BaseModel
from typing import Optional

API_URL = "http://localhost:8000"

async def test_errors():
    async with httpx.AsyncClient(base_url=API_URL) as client:
        # 1. Login
        r = await client.post("/api/v1/auth/login", data={"username": "integration_test@test.com", "password": "password123"})
        if r.status_code != 200:
            print("Failed to login", r.json())
            return
            
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get the test project
        r = await client.get("/api/v1/projects", headers=headers)
        projects = r.json()
        if not projects:
            print("No projects found!")
            return
        project_id = projects[0]["id"]
        
        # 3. Get integration token
        # If already exists, we might need to regenerate it or it's fine. We'll generate a new one to be sure we have it
        r = await client.post(f"/api/v1/projects/{project_id}/integration/generate", headers=headers)
        if r.status_code == 200:
            raw_integration_token = r.json()["token"]
        else:
            # If exists, we can't fetch it natively, so we regenerate
            r = await client.post(f"/api/v1/projects/{project_id}/integration/regenerate", headers=headers)
            raw_integration_token = r.json()["token"]
            
        print(f"Using integration token: {raw_integration_token}")
        
        # 4. Report an error
        agent_headers = {"Authorization": f"Bearer {raw_integration_token}"}
        error_payload = {
            "errorType": "TypeError",
            "message": "Cannot read properties of undefined (reading 'userId')",
            "severity": "ERROR",
            "source": "frontend",
            "environment": "production",
            "endpoint": "/checkout",
            "method": "POST",
            "statusCode": 500,
            "stackTrace": "TypeError: Cannot read properties of undefined\\n  at Checkout.render (checkout.tsx:42)\\n  at React.render"
        }
        
        r = await client.post("/api/v1/integration/errors", json=error_payload, headers=agent_headers)
        print("Report Error 1:", r.status_code, r.json())
        
        # Send duplicate to test grouping
        r = await client.post("/api/v1/integration/errors", json=error_payload, headers=agent_headers)
        print("Report Error 2 (duplicate):", r.status_code, r.json())
        
        # 5. Fetch Errors
        r = await client.get(f"/api/v1/projects/{project_id}/errors", headers=headers)
        print("Fetch Errors:", r.status_code)
        groups = r.json()["items"]
        print(f"Found {len(groups)} error groups.")
        for g in groups:
            print(f"Group: {g['errorType']} - Occurrences: {g['occurrenceCount']} - Status: {g['status']}")
            
        if groups:
            g_id = groups[0]["id"]
            
            # Fetch events
            r = await client.get(f"/api/v1/projects/{project_id}/errors/{g_id}/events", headers=headers)
            events = r.json()["items"]
            print(f"Found {len(events)} events for group {g_id}")
            
            # Resolve
            r = await client.patch(f"/api/v1/projects/{project_id}/errors/{g_id}/resolve", headers=headers)
            print("Resolve:", r.status_code)
            
            # Verify resolve
            r = await client.get(f"/api/v1/projects/{project_id}/errors/{g_id}", headers=headers)
            print("Status after resolve:", r.json()["status"])

if __name__ == "__main__":
    asyncio.run(test_errors())
