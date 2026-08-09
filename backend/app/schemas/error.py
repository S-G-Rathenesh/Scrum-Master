from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ErrorSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class ErrorSource(str, Enum):
    frontend = "frontend"
    backend = "backend"
    api = "api"
    integration = "integration"

class ErrorStatus(str, Enum):
    NEW = "NEW"
    ONGOING = "ONGOING"
    RESOLVED = "RESOLVED"

class ErrorEventCreate(BaseModel):
    errorType: str = Field(..., max_length=100)
    message: str = Field(..., max_length=1000)
    severity: ErrorSeverity = ErrorSeverity.ERROR
    source: ErrorSource
    environment: str = Field(default="production", max_length=50)
    endpoint: Optional[str] = Field(None, max_length=200)
    method: Optional[str] = Field(None, max_length=20)
    statusCode: Optional[int] = None
    stackTrace: Optional[str] = Field(None, max_length=10000)
    timestamp: Optional[datetime] = None

class ErrorGroupResponse(BaseModel):
    id: str
    projectId: str
    fingerprint: str
    errorType: str
    message: str
    severity: ErrorSeverity
    source: ErrorSource
    environment: str
    endpoint: Optional[str] = None
    status: ErrorStatus
    occurrenceCount: int
    firstSeenAt: datetime
    lastSeenAt: datetime
    resolvedAt: Optional[datetime] = None

class ErrorEventResponse(BaseModel):
    id: str
    groupId: str
    projectId: str
    errorType: str
    message: str
    endpoint: Optional[str] = None
    method: Optional[str] = None
    statusCode: Optional[int] = None
    stackTrace: Optional[str] = None
    timestamp: datetime
