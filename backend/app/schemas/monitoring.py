from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TargetType(str, Enum):
    FRONTEND = "frontend"
    BACKEND = "backend"

class MonitoringStatus(str, Enum):
    UP = "up"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"

class IncidentStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"

class MonitoringCheck(BaseModel):
    id: str
    projectId: str
    target: TargetType
    status: MonitoringStatus
    statusCode: Optional[int] = None
    responseTime: Optional[int] = None # in ms
    errorType: Optional[str] = None
    errorMessage: Optional[str] = None
    checkedAt: datetime

    class Config:
        populate_by_name = True

class Incident(BaseModel):
    id: str
    projectId: str
    target: TargetType
    status: IncidentStatus
    startedAt: datetime
    resolvedAt: Optional[datetime] = None
    failureCount: int
    lastError: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

class UptimeStats(BaseModel):
    uptimePercent: float
    totalChecks: int
    failedChecks: int
    avgResponseTime: int # in ms
