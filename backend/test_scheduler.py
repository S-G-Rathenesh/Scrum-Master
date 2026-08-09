import asyncio
import sys
import logging
from app.monitoring.scheduler import MonitoringScheduler
from app.database.mongodb import connect_to_mongo, close_mongo_connection, get_database

logging.basicConfig(level=logging.INFO)

async def test_scheduler():
    print("Testing MonitoringScheduler...")
    try:
        await connect_to_mongo()
        db = get_database()
        if db is None:
            print("DB not connected")
            sys.exit(1)
            
        scheduler = MonitoringScheduler(max_concurrent_checks=5)
        
        print("Starting scheduler...")
        await scheduler.start()
        
        # Test Duplicate Protection Manually
        print("Simulating duplicate check insertion...")
        scheduler._active_checks.add(("mock_project_id", "frontend"))
        
        print("Testing check on blocked duplicate...")
        res = await scheduler._perform_check_safe({"_id": "mock_project_id"}, "frontend", "http://google.com", asyncio.Semaphore(1))
        assert res == "unknown", "Duplicate check was not blocked!"
        print("Duplicate check successfully blocked!")
        
        print("Letting it run for a few seconds...")
        await asyncio.sleep(5)
        
        print("Stopping scheduler gracefully...")
        await scheduler.stop()
        
        await close_mongo_connection()
        print("All scheduler tests passed!")
        
    except Exception as e:
        print(f"Scheduler test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_scheduler())
