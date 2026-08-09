import asyncio
import os
import httpx
from pydantic import BaseModel
from typing import Optional

# Run against local instance
API_URL = "http://localhost:8000"

async def test_integration():
    # 1. We need a valid user token and a project.
    # To keep this test simple and fully automated, we will login, create a project, then test.
    async with httpx.AsyncClient(base_url=API_URL) as client:
        # Register a test user (might fail if exists, that's okay, we'll try login)
        user_data = {"email": "integration_test@test.com", "password": "password123", "name": "Integration Tester"}
        try:
            r = await client.post("/api/v1/auth/register", json=user_data)
        except Exception:
            pass
            
        r = await client.post("/api/v1/auth/login", data={"username": "integration_test@test.com", "password": "password123"})
        if r.status_code != 200:
            print("Failed to login")
            return
            
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a test project
        r = await client.post("/api/v1/projects", json={
            "name": "Integration Test Project",
            "frontendUrl": "https://test.com",
            "backendUrl": "https://api.test.com"
        }, headers=headers)
        
        project_id = r.json()["id"]
        print(f"Created project {project_id}")
        
        # Generate integration token
        r = await client.post(f"/api/v1/projects/{project_id}/integration/generate", headers=headers)
        if r.status_code != 200:
            print("Failed to generate token", r.json())
            return
            
        raw_integration_token = r.json()["token"]
        print(f"Generated token: {raw_integration_token}")
        
        # Check status
        r = await client.get(f"/api/v1/projects/{project_id}/integration/status", headers=headers)
        print("Status before heartbeat:", r.json()["status"])
        
        # Simulate Agent Heartbeat
        agent_headers = {"Authorization": f"Bearer {raw_integration_token}"}
        r = await client.post(
            "/api/v1/integration/heartbeat", 
            json={"agentVersion": "1.0.0"},
            headers=agent_headers
        )
        print("Heartbeat response:", r.json())
        
        # Check status again
        r = await client.get(f"/api/v1/projects/{project_id}/integration/status", headers=headers)
        print("Status after heartbeat:", r.json()["status"])
        
        # Try Revoking
        r = await client.post(f"/api/v1/projects/{project_id}/integration/revoke", headers=headers)
        print("Revoke response:", r.status_code)
        
        # Check status again
        r = await client.get(f"/api/v1/projects/{project_id}/integration/status", headers=headers)
        print("Status after revoke:", r.json()["status"])
        
        # Simulate Heartbeat after revoke
        r = await client.post(
            "/api/v1/integration/heartbeat", 
            json={"agentVersion": "1.0.0"},
            headers=agent_headers
        )
        print("Heartbeat after revoke response:", r.status_code, r.text)

if __name__ == "__main__":
    asyncio.run(test_integration())
