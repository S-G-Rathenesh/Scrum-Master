from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProjectStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class IntegrationStatus(str, Enum):
    NOT_CONNECTED = "NOT_CONNECTED"
    PENDING = "PENDING"
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    frontendUrl: Optional[str] = None
    backendUrl: Optional[str] = None
    monitoringEnabled: bool = False
    monitoringInterval: int = 300 # seconds, default 5m
    requestTimeout: int = 10 # seconds

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    frontendUrl: Optional[str] = None
    backendUrl: Optional[str] = None
    monitoringEnabled: Optional[bool] = None
    monitoringInterval: Optional[int] = None
    requestTimeout: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: str
    ownerId: str
    status: ProjectStatus
    integrationStatus: IntegrationStatus
    monitoringStatus: Optional[str] = "unknown"
    createdAt: datetime
    updatedAt: datetime
    lastCheckedAt: Optional[datetime] = None
    lastConnectedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
