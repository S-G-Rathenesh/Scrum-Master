from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.schemas.analytics import AnalyticsOverviewResponse
from app.services.analytics_service import AnalyticsService
from app.database.mongodb import get_database
from bson import ObjectId

router = APIRouter()

@router.get("/{project_id}/analytics/overview", response_model=AnalyticsOverviewResponse)
@router.get("/{project_id}/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    project_id: str,
    timeRange: str = Query("24h", pattern="^(24h|7d|30d)$"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Retrieve project analytics overview for the specified time range.
    Enforces project ownership.
    """
    db = get_database()
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": obj_id, "ownerId": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return await AnalyticsService.get_overview(project_id, timeRange)
