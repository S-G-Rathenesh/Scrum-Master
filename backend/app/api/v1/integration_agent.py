from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
from bson import ObjectId
from app.services.integration_service import process_heartbeat, validate_integration_token
from app.services.error_service import process_error_event
from app.schemas.error import ErrorEventCreate
from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import FeedbackService
from app.database.mongodb import get_database
from pymongo.errors import PyMongoError
from fastapi import BackgroundTasks

router = APIRouter()

class HeartbeatPayload(BaseModel):
    agentVersion: str
    metadata: Optional[dict] = None

@router.post("/heartbeat")
async def receive_heartbeat(
    payload: HeartbeatPayload,
    request: Request
):
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
        
    token = auth_header.replace("Bearer ", "")
    
    # Process heartbeat
    project_id = await process_heartbeat(token, payload.agentVersion)
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked integration credentials"
        )
        
    return {"status": "ok", "projectId": project_id}

@router.post("/errors")
async def receive_error(
    payload: ErrorEventCreate,
    request: Request
):
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
        
    token = auth_header.replace("Bearer ", "")
    
    # We can reuse the same token validation logic by passing a dummy agentVersion, 
    # but the process_heartbeat function updates the heartbeat time. That is acceptable 
    # as an error is also a form of activity.
    project_id = await process_heartbeat(token, "error-reporter")
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked integration credentials"
        )
        
    # Process Error
    # To implement strict rate limiting, we could check redis/mongo here.
    # For Phase 4, we will rely on the service grouping to limit DB growth, 
    # and simply process the event.
    try:
        group_id = await process_error_event(project_id, payload)
        return {"status": "ok", "groupId": group_id}
    except Exception as e:
        # We catch exceptions to prevent crashing the integrated app's expectation
        # though FastAPI handles it safely anyway.
        raise HTTPException(status_code=500, detail="Error processing event")

# Simple in-memory rate limiting dictionary for feedback (sliding window per integration_id)
# In production, use Redis or MongoDB based limiters
_feedback_rate_limits: Dict[str, list[datetime]] = {}
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 10

@router.post("/feedback")
async def receive_feedback(
    payload: FeedbackCreate,
    request: Request,
    background_tasks: BackgroundTasks
):
    # Extract token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
        
    token = auth_header.replace("Bearer ", "")
    
    # Validate token
    result = await validate_integration_token(token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked integration credentials"
        )
        
    project_id, integration_id = result
    
    # Check rate limit
    now = datetime.now(timezone.utc)
    if integration_id not in _feedback_rate_limits:
        _feedback_rate_limits[integration_id] = []
        
    # Clean up old timestamps
    _feedback_rate_limits[integration_id] = [
        t for t in _feedback_rate_limits[integration_id] 
        if (now - t).total_seconds() < RATE_LIMIT_WINDOW_SECONDS
    ]
    
    if len(_feedback_rate_limits[integration_id]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for feedback submission."
        )
        
    _feedback_rate_limits[integration_id].append(now)
    
    # Get project and user details to resolve email notifications
    db = get_database()
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    owner = await db.users.find_one({"_id": ObjectId(project["ownerId"])})
    if not owner:
        raise HTTPException(status_code=404, detail="Project owner not found")
        
    notification_settings = project.get("notificationSettings", {})
    email_notifications_enabled = notification_settings.get("emailNotifications", True) and notification_settings.get("newFeedback", True)
    
    try:
        feedback_response = await FeedbackService.create_feedback(
            project_id=project_id,
            integration_id=integration_id,
            feedback_in=payload,
            background_tasks=background_tasks,
            project_owner_email=owner["email"],
            project_name=project["name"],
            email_notifications_enabled=email_notifications_enabled
        )
        return {"status": "ok", "feedbackId": feedback_response["id"]}
    except PyMongoError as e:
        # DB failure - return 503 Service Unavailable so agent can retry
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception as e:
        # Silently fail for external apps to not crash them, returning generic 500 error
        raise HTTPException(status_code=500, detail="Error processing feedback")
