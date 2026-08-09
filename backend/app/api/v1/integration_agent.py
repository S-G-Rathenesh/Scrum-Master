from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
from app.services.integration_service import process_heartbeat

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
