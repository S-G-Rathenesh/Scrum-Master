from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = Field(default="NEW_FEEDBACK")  # NEW_FEEDBACK, CRITICAL_ERROR, INCIDENT, SYSTEM
    relatedEntity: Optional[str] = None       # feedback, error, incident
    relatedId: Optional[str] = None

class NotificationCreate(NotificationBase):
    projectId: str
    ownerId: str

class NotificationResponse(NotificationBase):
    id: str
    ownerId: str
    projectId: str
    isRead: bool = False
    createdAt: str

class NotificationUnreadCountResponse(BaseModel):
    unreadCount: int
