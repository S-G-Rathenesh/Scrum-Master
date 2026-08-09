from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class UptimeTrendPoint(BaseModel):
    timestamp: str # ISO string or time bucket
    uptimePercentage: float
    latencyMs: float

class UptimeAnalytics(BaseModel):
    uptimePercentage: float = 0.0
    totalChecks: int = 0
    successfulChecks: int = 0
    failedChecks: int = 0
    trend: List[UptimeTrendPoint] = []
    hasData: bool = False

class LatencyAnalytics(BaseModel):
    averageLatency: float = 0.0
    minLatency: float = 0.0
    maxLatency: float = 0.0
    trend: List[UptimeTrendPoint] = []

class IncidentAnalytics(BaseModel):
    totalIncidents: int = 0
    activeIncidents: int = 0
    resolvedIncidents: int = 0
    averageDurationMinutes: float = 0.0
    totalDowntimeMinutes: float = 0.0

class TopErrorGroup(BaseModel):
    id: str
    fingerprint: str
    occurrenceCount: int
    severity: str

class ErrorAnalytics(BaseModel):
    totalOccurrences: int = 0
    uniqueGroups: int = 0
    newErrors: int = 0
    resolvedErrors: int = 0
    criticalErrors: int = 0
    topErrors: List[TopErrorGroup] = []

class FeedbackAnalytics(BaseModel):
    totalFeedback: int = 0
    newFeedback: int = 0
    unreadFeedback: int = 0
    resolvedFeedback: int = 0
    categoryBreakdown: Dict[str, int] = {}

class HealthAnalytics(BaseModel):
    score: int = 100
    status: str = "Healthy" # "Healthy", "Degraded", "Critical", "Collecting data"

class AnalyticsOverviewResponse(BaseModel):
    projectId: str
    timeRange: str
    health: HealthAnalytics
    uptime: UptimeAnalytics
    performance: LatencyAnalytics
    incidents: IncidentAnalytics
    errors: ErrorAnalytics
    feedback: FeedbackAnalytics
