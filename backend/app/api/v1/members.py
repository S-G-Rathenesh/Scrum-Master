from fastapi import APIRouter, Depends, HTTPException, status, Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.database.mongodb import get_database
from app.api.dependencies import get_current_user, require_project_ownership
from app.schemas.user import UserResponse

router = APIRouter()

class MemberCreate(BaseModel):
    email: EmailStr
    accessLevel: str = Field("MEMBER", pattern="^(ADMIN|DEVELOPER|MEMBER|VIEWER)$")

class MemberResponse(BaseModel):
    id: str
    projectId: str
    email: str
    accessLevel: str
    status: str
    createdAt: datetime

@router.get("/projects/{project_id}/members", response_model=List[MemberResponse])
async def list_project_members(
    project_id: str = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    project=Depends(require_project_ownership)
):
    db = get_database()
    
    # Query members owned by current user for this project
    cursor = db.members.find({
        "projectId": ObjectId(project_id),
        "ownerId": current_user.id
    }).sort("createdAt", -1)
    
    members = []
    
    # Add owner entry first
    members.append(MemberResponse(
        id=f"owner_{current_user.id}",
        projectId=project_id,
        email=current_user.email,
        accessLevel="OWNER",
        status="ACTIVE",
        createdAt=project.get("createdAt", datetime.now(timezone.utc))
    ))
    
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["projectId"] = str(doc["projectId"])
        members.append(MemberResponse(**doc))
        
    return members

@router.post("/projects/{project_id}/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    payload: MemberCreate,
    project_id: str = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    project=Depends(require_project_ownership)
):
    db = get_database()
    now = datetime.now(timezone.utc)
    
    # Prevent duplicate member grant for same email in project
    existing = await db.members.find_one({
        "projectId": ObjectId(project_id),
        "ownerId": current_user.id,
        "email": payload.email.lower()
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Member access already granted for this email.")
        
    doc = {
        "projectId": ObjectId(project_id),
        "ownerId": current_user.id,
        "email": payload.email.lower(),
        "accessLevel": payload.accessLevel,
        "status": "ACTIVE",
        "createdAt": now,
        "updatedAt": now
    }
    
    result = await db.members.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc["projectId"] = project_id
    
    return MemberResponse(**doc)

@router.delete("/projects/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_project_member(
    project_id: str = Path(...),
    member_id: str = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    project=Depends(require_project_ownership)
):
    db = get_database()
    
    try:
        obj_id = ObjectId(member_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid member ID format")
        
    result = await db.members.delete_one({
        "_id": obj_id,
        "projectId": ObjectId(project_id),
        "ownerId": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member grant not found")
