from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import Optional
from app.api.dependencies import get_current_user, require_project_ownership
from app.schemas.user import UserResponse
from app.schemas.feedback import FeedbackListResponse, FeedbackResponse, FeedbackUpdate
from app.services.feedback_service import FeedbackService

router = APIRouter()

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
