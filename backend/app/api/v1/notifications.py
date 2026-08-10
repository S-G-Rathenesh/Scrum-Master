from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional
from bson import ObjectId
from app.api.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.schemas.notification import NotificationResponse, NotificationUnreadCountResponse
from app.services.notification_service import NotificationService
from app.database.mongodb import get_database

router = APIRouter()

async def _verify_project_owner(project_id: str, owner_id: str):
    db = get_database()
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": obj_id, "ownerId": owner_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.get("/{project_id}/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    project_id: str,
    unreadOnly: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    List notifications for a project, enforcing strict owner isolation.
    """
    await _verify_project_owner(project_id, current_user.id)
    return await NotificationService.get_notifications(
        owner_id=current_user.id,
        project_id=project_id,
        unread_only=unreadOnly,
        limit=limit
    )

@router.get("/{project_id}/notifications/unread-count", response_model=NotificationUnreadCountResponse)
async def get_unread_count(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get unread notification count for the authenticated project owner.
    """
    await _verify_project_owner(project_id, current_user.id)
    count = await NotificationService.get_unread_count(
        owner_id=current_user.id,
        project_id=project_id
    )
    return NotificationUnreadCountResponse(unreadCount=count)

@router.patch("/{project_id}/notifications/read-all")
async def mark_all_read(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Mark all notifications for a project as read.
    """
    await _verify_project_owner(project_id, current_user.id)
    count = await NotificationService.mark_all_as_read(
        owner_id=current_user.id,
        project_id=project_id
    )
    return {"message": "All notifications marked as read", "updatedCount": count}

@router.patch("/{project_id}/notifications/{notification_id}/read")
async def mark_single_read(
    project_id: str,
    notification_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Mark a single notification as read, enforcing strict owner isolation.
    """
    await _verify_project_owner(project_id, current_user.id)
    success = await NotificationService.mark_as_read(
        owner_id=current_user.id,
        project_id=project_id,
        notification_id=notification_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@router.delete("/{project_id}/notifications/{notification_id}")
async def delete_notification(
    project_id: str,
    notification_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Delete a notification for a project owner.
    """
    await _verify_project_owner(project_id, current_user.id)
    success = await NotificationService.delete_notification(
        owner_id=current_user.id,
        project_id=project_id,
        notification_id=notification_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return Response(status_code=24)
