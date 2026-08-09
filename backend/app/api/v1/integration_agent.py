from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
from app.services.integration_service import process_heartbeat
from app.services.error_service import process_error_event
from app.schemas.error import ErrorEventCreate

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
