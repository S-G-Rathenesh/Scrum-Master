from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from app.api.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.schemas.error import ErrorGroupResponse, ErrorEventResponse, ErrorStatus
from app.database.mongodb import get_database
from app.services.error_service import resolve_error_group

router = APIRouter()

async def verify_project_ownership(project_id: str, user_id: str):
    db = get_database()
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": obj_id, "ownerId": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return obj_id

@router.get("", response_model=dict)
async def list_error_groups(
    project_id: str,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    time_range: Optional[str] = Query("24h"), # 1h, 24h, 7d
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user)
):
    obj_id = await verify_project_ownership(project_id, current_user.id)
    db = get_database()
    
    query = {"projectId": obj_id}
    
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if source:
        query["source"] = source
    if environment:
        query["environment"] = environment
        
    now = datetime.now(timezone.utc)
    if time_range == "1h":
        query["lastSeenAt"] = {"$gte": now - timedelta(hours=1)}
    elif time_range == "24h":
        query["lastSeenAt"] = {"$gte": now - timedelta(hours=24)}
    elif time_range == "7d":
        query["lastSeenAt"] = {"$gte": now - timedelta(days=7)}
        
    skip = (page - 1) * limit
    
    cursor = db.error_groups.find(query).sort("lastSeenAt", -1).skip(skip).limit(limit)
    total = await db.error_groups.count_documents(query)
    
    items = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["projectId"] = str(doc["projectId"])
        items.append(ErrorGroupResponse(**doc))
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{group_id}", response_model=ErrorGroupResponse)
async def get_error_group(
    project_id: str,
    group_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    obj_id = await verify_project_ownership(project_id, current_user.id)
    db = get_database()
    
    try:
        group_obj_id = ObjectId(group_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid group ID")
        
    doc = await db.error_groups.find_one({"_id": group_obj_id, "projectId": obj_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Error group not found")
        
    doc["id"] = str(doc["_id"])
    doc["projectId"] = str(doc["projectId"])
    return ErrorGroupResponse(**doc)

@router.get("/{group_id}/events", response_model=dict)
async def list_error_events(
    project_id: str,
    group_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: UserResponse = Depends(get_current_user)
):
    obj_id = await verify_project_ownership(project_id, current_user.id)
    db = get_database()
    
    # Verify group exists
    try:
        group_obj_id = ObjectId(group_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid group ID")
        
    group_exists = await db.error_groups.find_one({"_id": group_obj_id, "projectId": obj_id})
    if not group_exists:
        raise HTTPException(status_code=404, detail="Error group not found")
        
    query = {"groupId": group_id, "projectId": obj_id}
    skip = (page - 1) * limit
    
    cursor = db.error_events.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    total = await db.error_events.count_documents(query)
    
    items = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["projectId"] = str(doc["projectId"])
        items.append(ErrorEventResponse(**doc))
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.patch("/{group_id}/resolve")
async def resolve_group(
    project_id: str,
    group_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    await verify_project_ownership(project_id, current_user.id)
    success = await resolve_error_group(project_id, group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Error group not found")
    return {"message": "Error resolved"}
