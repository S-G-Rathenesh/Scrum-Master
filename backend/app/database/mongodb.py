from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    # Hide URI from logs and use 5000ms server selection timeout to fail fast
    import certifi
    db.client = AsyncIOMotorClient(
        settings.MONGODB_URI, 
        serverSelectionTimeoutMS=5000, 
        tlsCAFile=certifi.where()
    )
    db.db = db.client[settings.DATABASE_NAME]
    logger.info("Connected to MongoDB!")
    
    # Create necessary indexes
    await setup_indexes()

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db.client:
        db.client.close()
    logger.info("MongoDB connection closed.")

async def setup_indexes():
    if db.db is None:
        return
        
    # Users collections
    await db.db.users.create_index([("email", ASCENDING)], unique=True)
    
    # Projects collection
    await db.db.projects.create_index([("ownerId", ASCENDING)])
    await db.db.projects.create_index([("monitoringEnabled", ASCENDING)])
    
    # Monitoring Checks collection
    await db.db.monitoring_checks.create_index([("projectId", ASCENDING), ("checkedAt", DESCENDING)])
    await db.db.monitoring_checks.create_index([("projectId", ASCENDING), ("target", ASCENDING), ("checkedAt", DESCENDING)])
    # 7-day retention TTL index
    await db.db.monitoring_checks.create_index([("checkedAt", ASCENDING)], expireAfterSeconds=604800)
    
    # Incidents collection
    await db.db.incidents.create_index([("projectId", ASCENDING), ("status", ASCENDING)])
    
    # Integrations collection
    await db.db.integrations.create_index([("projectId", ASCENDING)], unique=True)
    await db.db.integrations.create_index([("tokenHash", ASCENDING)], unique=True)
    
    # Error Groups collection
    await db.db.error_groups.create_index([("projectId", ASCENDING), ("fingerprint", ASCENDING)], unique=True)
    await db.db.error_groups.create_index([("projectId", ASCENDING), ("status", ASCENDING)])
    await db.db.error_groups.create_index([("projectId", ASCENDING), ("lastSeenAt", DESCENDING)])
    await db.db.error_groups.create_index([("projectId", ASCENDING), ("environment", ASCENDING)])
    
    # Error Events collection
    await db.db.error_events.create_index([("projectId", ASCENDING), ("timestamp", DESCENDING)])
    await db.db.error_events.create_index([("groupId", ASCENDING), ("timestamp", DESCENDING)])
    # 7-day TTL index for raw events
    await db.db.error_events.create_index([("timestamp", ASCENDING)], expireAfterSeconds=604800)
    
    # Feedback collection
    await db.db.feedback.create_index([("projectId", ASCENDING), ("createdAt", DESCENDING)])
    await db.db.feedback.create_index([("projectId", ASCENDING), ("status", ASCENDING)])
    await db.db.feedback.create_index([("projectId", ASCENDING), ("isRead", ASCENDING)])
    
def get_database():
    return db.db
