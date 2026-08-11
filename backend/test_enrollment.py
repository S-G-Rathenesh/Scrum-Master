import asyncio
from app.database.mongodb import connect_to_mongo, get_database
from app.services.enrollment_service import create_enrollment_credential

async def test():
    await connect_to_mongo()
    db = get_database()
    print("DB:", db)
    try:
        token = await create_enrollment_credential("test_user_123")
        print("Token:", token[:30], "...")
    except Exception as e:
        print("ERROR:", type(e).__name__, e)
        import traceback
        traceback.print_exc()

asyncio.run(test())
