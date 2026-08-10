from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.database.mongodb import get_database
from app.api.dependencies import get_current_user
from app.api.v1.projects import validate_object_id
from app.schemas.user import UserResponse
from app.schemas.monitoring import MonitoringCheck, Incident, UptimeStats
from pydantic import BaseModel

router = APIRouter()

class MonitoringUpdate(BaseModel):
    monitoringEnabled: Optional[bool] = None
    monitoringInterval: Optional[int] = None
    frontendUrl: Optional[str] = None
    backendUrl: Optional[str] = None

async def verify_project_ownership(project_id: str, current_user: UserResponse, db) -> dict:
    obj_id = validate_object_id(project_id)
    project = await db.projects.find_one({"_id": obj_id, "ownerId": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}/monitoring")
async def update_monitoring_settings(
    project_id: str,
    update_data: MonitoringUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    project = await verify_project_ownership(project_id, current_user, db)
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        update_dict["updatedAt"] = datetime.now(timezone.utc)
        await db.projects.update_one(
            {"_id": project["_id"], "ownerId": current_user.id},
            {"$set": update_dict}
        )
        
    return {"status": "success"}

@router.get("/{project_id}/monitoring/history")
async def get_monitoring_history(
    project_id: str,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    await verify_project_ownership(project_id, current_user, db)
    
    checks_cursor = db.monitoring_checks.find({"projectId": project_id}).sort("checkedAt", -1).limit(limit)
    checks = await checks_cursor.to_list(length=limit)
    
    # Map _id for pydantic
    for check in checks:
        check["id"] = str(check["_id"])
        
    return checks

@router.get("/{project_id}/incidents")
async def get_incidents(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    await verify_project_ownership(project_id, current_user, db)
    
    incidents_cursor = db.incidents.find({"projectId": project_id}).sort("startedAt", -1)
    incidents = await incidents_cursor.to_list(length=100)
    
    for incident in incidents:
        incident["id"] = str(incident["_id"])
        
    return incidents

@router.get("/{project_id}/uptime", response_model=UptimeStats)
async def get_uptime(
    project_id: str,
    days: int = 1,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    await verify_project_ownership(project_id, current_user, db)
    
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    pipeline = [
        {"$match": {
            "projectId": project_id,
            "checkedAt": {"$gte": since}
        }},
        {"$group": {
            "_id": None,
            "totalChecks": {"$sum": 1},
            "failedChecks": {
                "$sum": {"$cond": [{"$eq": ["$status", "down"]}, 1, 0]}
            },
            "totalResponseTime": {"$sum": "$responseTime"}
        }}
    ]
    
    result = await db.monitoring_checks.aggregate(pipeline).to_list(length=1)
    
    if not result:
        return UptimeStats(uptimePercent=0.0, totalChecks=0, failedChecks=0, avgResponseTime=0)
        
    stats = result[0]
    total = stats["totalChecks"]
    failed = stats["failedChecks"]
    avg_resp = stats["totalResponseTime"] / total if total > 0 and stats["totalResponseTime"] else 0
    
    uptime = ((total - failed) / total) * 100 if total > 0 else 0.0
    
    return UptimeStats(
        uptimePercent=round(uptime, 2),
        totalChecks=total,
        failedChecks=failed,
        avgResponseTime=int(avg_resp)
    )
