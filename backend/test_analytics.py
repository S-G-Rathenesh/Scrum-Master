import asyncio
import logging
from app.database.mongodb import get_database, connect_to_mongo, close_mongo_connection
from app.services.analytics_service import AnalyticsService
from pymongo.errors import PyMongoError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_analytics():
    try:
        await connect_to_mongo()
        db = get_database()
        
        # 1. Get a project
        project = await db.projects.find_one({})
        if not project:
            logger.warning("No projects found to test analytics.")
            return
            
        project_id = str(project["_id"])
        logger.info(f"Testing analytics for project: {project['name']} ({project_id})")
        
        # 2. Test 24h Overview
        overview_24h = await AnalyticsService.get_overview(project_id, "24h")
        logger.info(f"[24h] Health: {overview_24h.health.score} ({overview_24h.health.status})")
        logger.info(f"[24h] Uptime: {overview_24h.uptime.uptimePercentage}% (Data: {overview_24h.uptime.hasData})")
        logger.info(f"[24h] Incidents: {overview_24h.incidents.totalIncidents}")
        logger.info(f"[24h] Errors: {overview_24h.errors.totalOccurrences}")
        logger.info(f"[24h] Feedback: {overview_24h.feedback.totalFeedback}")
        
        # 3. Test 7d Overview
        overview_7d = await AnalyticsService.get_overview(project_id, "7d")
        logger.info(f"[7d] Uptime: {overview_7d.uptime.uptimePercentage}%")
        
    except PyMongoError as e:
        logger.error(f"MongoDB connection failed: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_analytics())
