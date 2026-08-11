import asyncio
from app.main import app
from httpx import AsyncClient

async def test_endpoint():
    from app.database.mongodb import connect_to_mongo, close_mongo_connection
    await connect_to_mongo()
    try:
        import httpx
        from app.api.dependencies import get_current_user
        from app.schemas.user import UserResponse

        async def override_get_current_user():
            return UserResponse(id="test_user", email="test@test.com", username="test", role="user", is_active=True, createdAt="2023-01-01", updatedAt="2023-01-01", authProvider="local")

        app.dependency_overrides[get_current_user] = override_get_current_user

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/integration/enrollment-package?backend_url=https://prod.api.scrummaster.com")
            print(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                import zipfile
                import io

                with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
                    agent_content = zip_file.read("scrum-master/scrum-master-agent.js").decode("utf-8")
                    config_content = zip_file.read("scrum-master/scrum-master.config.example").decode("utf-8")

                    print("--- Agent Content Snippet ---")
                    print(agent_content[:500])
                    print("\n--- Config Content Snippet ---")
                    print(config_content)

                    if "localhost" in agent_content or "127.0.0.1" in agent_content:
                        print("\n!!! FAILURE: Agent still contains localhost URL !!!")
                    elif "https://prod.api.scrummaster.com" in agent_content:
                        print("\n*** SUCCESS: Agent contains correct production URL ***")
            else:
                print(f"Error: {response.text}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_endpoint())
