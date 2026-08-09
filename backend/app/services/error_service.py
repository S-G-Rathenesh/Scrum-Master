import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from bson import ObjectId
from app.database.mongodb import get_database
from app.schemas.error import ErrorEventCreate, ErrorStatus
from app.services.error_sanitizer import sanitize_string, generate_fingerprint

# Limits
MAX_MESSAGE_LENGTH = 1000
MAX_STACK_TRACE_LENGTH = 10000

async def process_error_event(project_id: str, event: ErrorEventCreate) -> str:
    """
    Processes an incoming error event:
    1. Validates sizes
    2. Sanitizes sensitive data
    3. Generates fingerprint
    4. Groups the error (creates or updates group)
    5. Inserts the raw event
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    
    # 1. Size Validation (though Pydantic does this, doing it explicitly in logic is safe)
    if len(event.message or "") > MAX_MESSAGE_LENGTH:
        event.message = event.message[:MAX_MESSAGE_LENGTH] + "... [TRUNCATED]"
        
    if len(event.stackTrace or "") > MAX_STACK_TRACE_LENGTH:
        event.stackTrace = event.stackTrace[:MAX_STACK_TRACE_LENGTH] + "... [TRUNCATED]"
        
    # 2. Sanitize
    safe_message = sanitize_string(event.message)
    safe_stack = sanitize_string(event.stackTrace) if event.stackTrace else None
    
    # 3. Fingerprint
    fingerprint = generate_fingerprint(
        error_type=event.errorType,
        message=safe_message,
        source=event.source.value,
        endpoint=event.endpoint
    )
    
    # 4. Grouping
    group_filter = {
        "projectId": ObjectId(project_id) if isinstance(project_id, str) and len(project_id) == 24 else project_id,
        "fingerprint": fingerprint
    }
    
    # Use find_one_and_update with upsert for atomicity
    group_update = {
        "$setOnInsert": {
            "projectId": group_filter["projectId"],
            "fingerprint": fingerprint,
            "errorType": event.errorType,
            "message": safe_message,
            "severity": event.severity.value,
            "source": event.source.value,
            "environment": event.environment,
            "endpoint": event.endpoint,
            "firstSeenAt": now,
        },
        "$set": {
            "lastSeenAt": now,
            "status": ErrorStatus.ONGOING.value,
        },
        "$inc": {
            "occurrenceCount": 1
        }
    }
    
    group_doc = await db.error_groups.find_one_and_update(
        group_filter,
        group_update,
        upsert=True,
        return_document=True
    )
    
    group_id = str(group_doc["_id"])
    
    # 5. Insert Event
    event_doc = {
        "_id": str(uuid.uuid4()),
        "groupId": group_id,
        "projectId": group_filter["projectId"],
        "errorType": event.errorType,
        "message": safe_message,
        "endpoint": event.endpoint,
        "method": event.method,
        "statusCode": event.statusCode,
        "stackTrace": safe_stack,
        "timestamp": now  # Using server authoritative time
    }
    
    await db.error_events.insert_one(event_doc)
    
    return group_id

async def resolve_error_group(project_id: str, group_id: str) -> bool:
    """Marks an error group as resolved."""
    db = get_database()
    now = datetime.now(timezone.utc)
    
    obj_id = ObjectId(group_id)
    proj_id = ObjectId(project_id) if isinstance(project_id, str) and len(project_id) == 24 else project_id
    
    result = await db.error_groups.update_one(
        {"_id": obj_id, "projectId": proj_id},
        {"$set": {
            "status": ErrorStatus.RESOLVED.value,
            "resolvedAt": now
        }}
    )
    
    return result.modified_count > 0
