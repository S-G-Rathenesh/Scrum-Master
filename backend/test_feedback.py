import asyncio
from httpx import AsyncClient
import logging
from app.database.mongodb import get_database, connect_to_mongo, close_mongo_connection
from app.services.integration_service import create_or_regenerate_integration
from pymongo.errors import PyMongoError
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_feedback():
    try:
        await connect_to_mongo()
        db = get_database()
    
    # 1. Get a project
    project = await db.projects.find_one({})
    if not project:
        logger.error("No project found.")
        return
        
    project_id = str(project["_id"])
    logger.info(f"Using Project: {project['name']} ({project_id})")
    
    # 2. Get/Create token
    token = await create_or_regenerate_integration(project_id)
    logger.info(f"Generated token: {token}")
    
    # 3. Submit feedback
    logger.info("Submitting feedback via API...")
    async with AsyncClient(app=None, base_url="http://localhost:8000") as client: # assuming uvicorn is running
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "subject": "App crashes on login",
            "message": "When I try to log in, the app just crashes and I see a white screen. <script>alert('xss')</script>",
            "category": "BUG",
            "source": "IN_APP"
        }
        
        response = await client.post(
            "/api/v1/integration/feedback",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            logger.info("Feedback submitted successfully!")
            data = response.json()
            feedback_id = data.get("feedbackId")
            
            # Check DB to verify sanitization
            feedback_doc = await db.feedback.find_one({"_id": feedback_id}) # it is stored as ObjectId but we will check using str equivalent in another way
            if not feedback_doc:
                # Find the latest one
                feedback_doc = await db.feedback.find_one(sort=[("createdAt", -1)])
                
            if feedback_doc:
                logger.info(f"Stored message: {feedback_doc.get('message')}")
                if "<script>" not in feedback_doc.get("message"):
                    logger.info("XSS sanitized successfully.")
                else:
                    logger.error("Sanitization FAILED.")
        else:
            logger.error(f"Failed to submit feedback: {response.status_code} - {response.text}")
            
    except PyMongoError as e:
        logger.error(f"MongoDB connection failed: {e}")
        logger.error("This is likely due to the local IP not being whitelisted in Atlas Network Access.")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_feedback())
