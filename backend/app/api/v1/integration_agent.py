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
from app.services.enrollment_service import consume_enrollment_credential
from app.services.integration_service import create_or_regenerate_integration
from app.schemas.project import ProjectStatus, IntegrationStatus

router = APIRouter()

class HeartbeatPayload(BaseModel):
    agentVersion: str
    metadata: Optional[dict] = None

class EnrollPayload(BaseModel):
    application_name: Optional[str] = "Connected Application"
    framework: Optional[str] = None
    backend: Optional[str] = None
    environment: Optional[str] = "development"
    agent_version: Optional[str] = "1.0.0"
    metadata: Optional[dict] = None

@router.post("/enroll")
async def enroll_application(
    payload: EnrollPayload,
    request: Request
):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
        
    token = auth_header.replace("Bearer ", "")
    
    if not token.startswith("sm_enroll_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requires enrollment token format sm_enroll_..."
        )
        
    owner_id, enrollment_id = await consume_enrollment_credential(token)
    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or already used enrollment credential"
        )
        
    db = get_database()
    now = datetime.now(timezone.utc)
    app_name = payload.application_name or (payload.metadata.get("name") if payload.metadata else "Connected Application")
    
    # Check for existing project for this user to prevent duplicate projects
    existing = await db.projects.find_one({"ownerId": owner_id, "name": app_name})
    if existing:
        project_id = str(existing["_id"])
    else:
        project_doc = {
            "name": app_name,
            "ownerId": owner_id,
            "status": ProjectStatus.ACTIVE.value,
            "integrationStatus": IntegrationStatus.CONNECTED.value,
            "framework": payload.framework,
            "backend": payload.backend,
            "environment": payload.environment,
            "createdAt": now,
            "updatedAt": now,
            "lastConnectedAt": now
        }
        result = await db.projects.insert_one(project_doc)
        project_id = str(result.inserted_id)

    project_token = await create_or_regenerate_integration(project_id)
    await process_heartbeat(project_token, payload.agent_version or "1.0.0")

    # Link the consumed enrollment to this project
    if enrollment_id:
        await db.enrollments.update_one(
            {"_id": ObjectId(enrollment_id)},
            {"$set": {"projectId": project_id}}
        )

    return {
        "status": "ok", 
        "projectId": project_id, 
        "projectToken": project_token,
        "name": app_name,
        "framework": payload.framework,
        "environment": payload.environment
    }

@router.post("/heartbeat")
async def receive_heartbeat(
    payload: HeartbeatPayload,
    request: Request
):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
        
    token = auth_header.replace("Bearer ", "")
    
    if token.startswith("sm_enroll_"):
        owner_id = await consume_enrollment_credential(token)
        if not owner_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired, or already used enrollment credential"
            )
            
        db = get_database()
        now = datetime.now(timezone.utc)
        project_name = "Connected Application"
        if payload.metadata and "name" in payload.metadata:
            project_name = payload.metadata["name"]
            
        existing = await db.projects.find_one({"ownerId": owner_id, "name": project_name})
        if existing:
            project_id = str(existing["_id"])
        else:
            project_doc = {
                "name": project_name,
                "ownerId": owner_id,
                "status": ProjectStatus.ACTIVE.value,
                "integrationStatus": IntegrationStatus.CONNECTED.value,
                "createdAt": now,
                "updatedAt": now,
                "lastConnectedAt": now
            }
            result = await db.projects.insert_one(project_doc)
            project_id = str(result.inserted_id)
            
        project_token = await create_or_regenerate_integration(project_id)
        await process_heartbeat(project_token, payload.agentVersion)
        
        return {
            "status": "ok", 
            "projectId": project_id, 
            "projectToken": project_token,
            "name": project_name
        }
    
    # Normal project heartbeat
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
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
        
    token = auth_header.replace("Bearer ", "")
    project_id = await process_heartbeat(token, "error-reporter")
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked integration credentials"
        )
        
    try:
        group_id = await process_error_event(project_id, payload)
        return {"status": "ok", "groupId": group_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error processing event")

_feedback_rate_limits: Dict[str, list[datetime]] = {}
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 10

@router.post("/feedback")
async def receive_feedback(
    payload: FeedbackCreate,
    request: Request,
    background_tasks: BackgroundTasks
):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
        
    token = auth_header.replace("Bearer ", "")
    result = await validate_integration_token(token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked integration credentials"
        )
        
    project_id, integration_id = result
    now = datetime.now(timezone.utc)
    if integration_id not in _feedback_rate_limits:
        _feedback_rate_limits[integration_id] = []
        
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
            email_notifications_enabled=email_notifications_enabled,
            owner_id=project.get("ownerId")
        )
        return {"status": "ok", "feedbackId": feedback_response["id"]}
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except Exception:
        raise HTTPException(status_code=500, detail="Error processing feedback")
