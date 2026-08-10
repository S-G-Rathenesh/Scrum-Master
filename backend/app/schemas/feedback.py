from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional
from datetime import datetime
from enum import Enum

class FeedbackCategory(str, Enum):
    GENERAL = "GENERAL"
    BUG = "BUG"
    FEATURE_REQUEST = "FEATURE_REQUEST"
    COMPLAINT = "COMPLAINT"
    QUESTION = "QUESTION"
    OTHER = "OTHER"

class FeedbackSource(str, Enum):
    CONTACT_FORM = "CONTACT_FORM"
    FEEDBACK_FORM = "FEEDBACK_FORM"
    IN_APP = "IN_APP"

class FeedbackStatus(str, Enum):
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    ARCHIVED = "ARCHIVED"

class FeedbackPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"

class FeedbackCreate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=200)
    subject: Optional[str] = Field(None, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)
    category: FeedbackCategory = FeedbackCategory.GENERAL
    source: FeedbackSource = FeedbackSource.FEEDBACK_FORM
    pageUrl: Optional[str] = Field(None, max_length=1000)

class FeedbackResponse(BaseModel):
    id: str
    projectId: str
    integrationId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    subject: Optional[str] = None
    message: str
    category: FeedbackCategory
    source: FeedbackSource
    pageUrl: Optional[str] = None
    status: FeedbackStatus
    priority: FeedbackPriority
    reply: Optional[str] = None
    repliedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    
    class Config:
        populate_by_name = True

class FeedbackListResponse(BaseModel):
    items: list[FeedbackResponse]
    total: int
    page: int
    pages: int

class FeedbackUpdate(BaseModel):
    status: Optional[FeedbackStatus] = None
    priority: Optional[FeedbackPriority] = None
    isRead: Optional[bool] = None
    reply: Optional[str] = None
