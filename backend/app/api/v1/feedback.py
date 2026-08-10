from fastapi import APIRouter, Depends, HTTPException, Query, Path, BackgroundTasks
from typing import Optional
from bson import ObjectId
from app.database.mongodb import get_database
from app.api.dependencies import get_current_user, require_project_ownership
from app.schemas.user import UserResponse
from app.schemas.feedback import FeedbackListResponse, FeedbackResponse, FeedbackUpdate, FeedbackCreate
from app.services.feedback_service import FeedbackService

router = APIRouter()

@router.post("", response_model=dict)
async def create_project_feedback(
    payload: FeedbackCreate,
    background_tasks: BackgroundTasks,
    project_id: str = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    project=Depends(require_project_ownership)
):
    db = get_database()
    owner = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not owner:
        raise HTTPException(status_code=404, detail="User not found")
        
    notification_settings = project.get("notificationSettings", {})
    email_notifications_enabled = notification_settings.get("emailNotifications", True) and notification_settings.get("newFeedback", True)
    
    feedback_response = await FeedbackService.create_feedback(
        project_id=project_id,
        integration_id=None,
        feedback_in=payload,
        background_tasks=background_tasks,
        project_owner_email=owner["email"],
        project_name=project["name"],
        email_notifications_enabled=email_notifications_enabled,
        owner_id=current_user.id
    )
    return {"status": "ok", "feedbackId": feedback_response["id"]}

@router.get("", response_model=FeedbackListResponse)
async def get_feedback(
    project_id: str = Path(...),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    is_read: Optional[bool] = None,
    current_user: UserResponse = Depends(get_current_user),
    _=Depends(require_project_ownership)
):
    items, total = await FeedbackService.get_feedback_list(
        project_id=project_id,
        page=page,
        limit=limit,
        status=status,
        priority=priority,
        category=category,
        is_read=is_read
    )
    
    pages = (total + limit - 1) // limit
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages
    }

@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback_detail(
    project_id: str = Path(...),
    feedback_id: str = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    _=Depends(require_project_ownership)
):
    item = await FeedbackService.get_feedback_detail(project_id, feedback_id)
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    # Automatically mark as read if it's new/unread
    if not item.get("isRead"):
        await FeedbackService.update_feedback(project_id, feedback_id, {"isRead": True})
        item["isRead"] = True
        
    return item

@router.patch("/{feedback_id}", response_model=dict)
async def update_feedback(
    update_data: FeedbackUpdate,
    project_id: str = Path(...),
    feedback_id: str = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    _=Depends(require_project_ownership)
):
    success = await FeedbackService.update_feedback(
        project_id, 
        feedback_id, 
        update_data.model_dump(exclude_unset=True)
    )
    if not success:
        raise HTTPException(status_code=404, detail="Feedback not found or not modified")
        
    return {"status": "ok"}
