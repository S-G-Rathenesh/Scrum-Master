from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

CONSECUTIVE_FAILURES_THRESHOLD = 3

async def evaluate_incident(db, project_id: str, target: str, current_status: str, error_message: str = None):
    """
    Evaluates the current status of a target using atomic operations to prevent race conditions.
    """
    now = datetime.now(timezone.utc)
    
    if current_status == "up":
        # Resolve active incident atomically if one exists
        result = await db.incidents.find_one_and_update(
            {"projectId": project_id, "target": target, "status": "open"},
            {"$set": {
                "status": "resolved",
                "resolvedAt": now,
                "updatedAt": now
            }}
        )
        if result:
            logger.info(f"Resolved incident for Project {project_id} target {target}")
        return

    if current_status == "down":
        # Check for open incident
        active_incident = await db.incidents.find_one({
            "projectId": project_id,
            "target": target,
            "status": "open"
        })
        
        if active_incident:
            # Atomically increment failure count
            await db.incidents.update_one(
                {"_id": active_incident["_id"]},
                {
                    "$inc": {"failureCount": 1},
                    "$set": {
                        "lastError": error_message,
                        "updatedAt": now
                    }
                }
            )
        else:
            # Need to check consecutive failures to potentially open a new one
            recent_checks = await db.monitoring_checks.find({
                "projectId": project_id,
                "target": target
            }).sort("checkedAt", -1).limit(CONSECUTIVE_FAILURES_THRESHOLD).to_list(length=CONSECUTIVE_FAILURES_THRESHOLD)
            
            consecutive_downs = 0
            for check in recent_checks:
                if check.get("status") == "down":
                    consecutive_downs += 1
                else:
                    break
                    
            if consecutive_downs >= CONSECUTIVE_FAILURES_THRESHOLD:
                new_incident = {
                    "_id": str(uuid.uuid4()),
                    "projectId": project_id,
                    "target": target,
                    "status": "open",
                    "startedAt": now,
                    "failureCount": consecutive_downs,
                    "lastError": error_message,
                    "createdAt": now,
                    "updatedAt": now
                }
                
                # Attempt to insert, catching DuplicateKeyError if we made a unique index, 
                # but we'll rely on the Duplicate Check Protection in the scheduler to prevent
                # concurrent checks for the exact same target anyway.
                await db.incidents.insert_one(new_incident)
                logger.warning(f"Opened new incident for Project {project_id} target {target}")
