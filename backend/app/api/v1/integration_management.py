from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.api.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.services.integration_service import (
    create_or_regenerate_integration,
    revoke_integration,
    get_integration_status
)
from app.database.mongodb import get_database
from bson import ObjectId

router = APIRouter()

class IntegrationStatusResponse(BaseModel):
    status: str
    createdAt: datetime
    updatedAt: datetime
    lastHeartbeatAt: Optional[datetime] = None
    connectedAt: Optional[datetime] = None
    revokedAt: Optional[datetime] = None
    agentVersion: Optional[str] = None

class TokenResponse(BaseModel):
    token: str

async def verify_project_ownership(project_id: str, user_id: str):
    db = get_database()
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": obj_id, "ownerId": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.get("/status", response_model=IntegrationStatusResponse)
async def get_status(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    await verify_project_ownership(project_id, current_user.id)
    doc = await get_integration_status(project_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Integration not configured")
    return IntegrationStatusResponse(**doc)

@router.post("/generate", response_model=TokenResponse)
async def generate_token(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    await verify_project_ownership(project_id, current_user.id)
    doc = await get_integration_status(project_id)
    if doc and doc.get("status") not in ["REVOKED", "DISCONNECTED"]:
        # If they want to regenerate, they should use the /regenerate endpoint
        pass # allow anyway to simplify logic, but usually we differentiate
        
    raw_token = await create_or_regenerate_integration(project_id)
    return TokenResponse(token=raw_token)

@router.post("/regenerate", response_model=TokenResponse)
async def regenerate_token(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    await verify_project_ownership(project_id, current_user.id)
    raw_token = await create_or_regenerate_integration(project_id)
    return TokenResponse(token=raw_token)

@router.post("/revoke")
async def revoke_token(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    await verify_project_ownership(project_id, current_user.id)
    success = await revoke_integration(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Integration not found or already revoked")
    return {"message": "Integration revoked successfully"}
