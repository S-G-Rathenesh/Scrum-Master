from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.database.mongodb import get_database
from app.schemas.analytics import AnalyticsOverviewResponse, HealthAnalytics, UptimeAnalytics, LatencyAnalytics, IncidentAnalytics, ErrorAnalytics, FeedbackAnalytics, UptimeTrendPoint, TopErrorGroup
from pymongo import ASCENDING, DESCENDING
import math

class AnalyticsService:

    @staticmethod
    def _parse_time_range(time_range: str) -> datetime:
        now = datetime.now(timezone.utc)
        if time_range == "7d":
            return now - timedelta(days=7)
        elif time_range == "30d":
            return now - timedelta(days=30)
        else: # default 24h
            return now - timedelta(hours=24)

    @staticmethod
    def _get_date_format_for_bucket(time_range: str) -> str:
        if time_range == "24h":
            return "%Y-%m-%dT%H:00:00Z" # Group by hour
        else:
            return "%Y-%m-%dT00:00:00Z" # Group by day

    @staticmethod
    async def get_overview(project_id: str, time_range: str = "24h") -> AnalyticsOverviewResponse:
        db = get_database()
        start_time = AnalyticsService._parse_time_range(time_range)
        now = datetime.now(timezone.utc)
        
        # 1. Uptime & Performance (Monitoring Checks)
        # Note: monitoring_checks has a 7-day TTL. So for 30d, it will only process available 7 days.
        checks_pipeline = [
            {"$match": {"projectId": project_id, "checkedAt": {"$gte": start_time}}},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "success": {"$sum": {"$cond": [{"$eq": ["$status", "up"]}, 1, 0]}},
                "failed": {"$sum": {"$cond": [{"$ne": ["$status", "up"]}, 1, 0]}},
                "avgLatency": {"$avg": "$responseTime"},
                "minLatency": {"$min": "$responseTime"},
                "maxLatency": {"$max": "$responseTime"}
            }}
        ]
        
        checks_cursor = db.monitoring_checks.aggregate(checks_pipeline)
        checks_data = await checks_cursor.to_list(length=1)
        
        has_data = False
        uptime_pct = 0.0
        if checks_data and checks_data[0]["total"] > 0:
            c = checks_data[0]
            has_data = True
            uptime_pct = (c["success"] / c["total"]) * 100
            uptime = UptimeAnalytics(
                uptimePercentage=uptime_pct,
                totalChecks=c["total"],
                successfulChecks=c["success"],
                failedChecks=c["failed"],
                hasData=True
            )
            performance = LatencyAnalytics(
                averageLatency=c.get("avgLatency") or 0.0,
                minLatency=c.get("minLatency") or 0.0,
                maxLatency=c.get("maxLatency") or 0.0
            )
        else:
            uptime = UptimeAnalytics(hasData=False)
            performance = LatencyAnalytics()

        # Uptime Trend (Buckets)
        date_format = AnalyticsService._get_date_format_for_bucket(time_range)
        trend_pipeline = [
            {"$match": {"projectId": project_id, "checkedAt": {"$gte": start_time}}},
            {"$group": {
                "_id": {"$dateToString": {"format": date_format, "date": "$checkedAt"}},
                "total": {"$sum": 1},
                "success": {"$sum": {"$cond": [{"$eq": ["$status", "up"]}, 1, 0]}},
                "avgLatency": {"$avg": "$responseTime"}
            }},
            {"$sort": {"_id": ASCENDING}}
        ]
        trend_cursor = db.monitoring_checks.aggregate(trend_pipeline)
        trend_data = await trend_cursor.to_list(length=100)
        
        trend_points = []
        for t in trend_data:
            t_pct = (t["success"] / t["total"]) * 100 if t["total"] > 0 else 0.0
            trend_points.append(UptimeTrendPoint(
                timestamp=t["_id"],
                uptimePercentage=t_pct,
                latencyMs=t.get("avgLatency") or 0.0
            ))
        uptime.trend = trend_points
        performance.trend = trend_points

        # 2. Incidents
        incidents_cursor = db.incidents.find({"projectId": project_id, "startedAt": {"$gte": start_time}})
        incidents = await incidents_cursor.to_list(length=1000)
        
        total_incidents = len(incidents)
        active_incidents = sum(1 for i in incidents if i["status"] == "active")
        resolved_incidents = total_incidents - active_incidents
        
        total_downtime_minutes = 0.0
        for i in incidents:
            start = i["startedAt"]
            # Ensure naive datetimes are treated as UTC if they are naive, or convert if needed.
            # Assuming MongoDB driver returns UTC aware datetimes
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
                
            if i["status"] == "resolved" and "resolvedAt" in i and i["resolvedAt"]:
                end = i["resolvedAt"]
                if end.tzinfo is None:
                    end = end.replace(tzinfo=timezone.utc)
                total_downtime_minutes += (end - start).total_seconds() / 60.0
            else:
                total_downtime_minutes += (now - start).total_seconds() / 60.0
                
        avg_duration = (total_downtime_minutes / total_incidents) if total_incidents > 0 else 0.0
        
        incident_analytics = IncidentAnalytics(
            totalIncidents=total_incidents,
            activeIncidents=active_incidents,
            resolvedIncidents=resolved_incidents,
            averageDurationMinutes=avg_duration,
            totalDowntimeMinutes=total_downtime_minutes
        )

        # 3. Errors
        error_groups_cursor = db.error_groups.find({"projectId": project_id})
        error_groups = await error_groups_cursor.to_list(length=None)
        
        # We need events specifically for the time range to get accurate event count
        events_count = await db.error_events.count_documents({"projectId": project_id, "timestamp": {"$gte": start_time}})
        
        total_groups = len(error_groups)
        resolved_groups = sum(1 for eg in error_groups if eg["status"] == "resolved")
        new_groups = sum(1 for eg in error_groups if eg.get("createdAt") and eg["createdAt"].replace(tzinfo=timezone.utc) >= start_time)
        critical_groups = sum(1 for eg in error_groups if eg.get("severity") in ["CRITICAL", "ERROR"] and eg["status"] != "resolved")
        
        # Sort by occurrence for top 5
        sorted_groups = sorted(error_groups, key=lambda x: x.get("occurrenceCount", 0), reverse=True)[:5]
        top_errors = [
            TopErrorGroup(
                id=str(eg["_id"]),
                fingerprint=eg["fingerprint"],
                occurrenceCount=eg.get("occurrenceCount", 0),
                severity=eg.get("severity", "ERROR")
            )
            for eg in sorted_groups
        ]
        
        error_analytics = ErrorAnalytics(
            totalOccurrences=events_count, # raw events in window
            uniqueGroups=total_groups,
            newErrors=new_groups,
            resolvedErrors=resolved_groups,
            criticalErrors=critical_groups,
            topErrors=top_errors
        )

        # 4. Feedback
        feedback_pipeline = [
            {"$match": {"projectId": project_id, "createdAt": {"$gte": start_time}}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "unread": {"$sum": {"$cond": [{"$eq": ["$isRead", False]}, 1, 0]}}
            }}
        ]
        fb_cursor = db.feedback.aggregate(feedback_pipeline)
        fb_data = await fb_cursor.to_list(length=100)
        
        total_fb = 0
        new_fb = 0
        unread_fb = 0
        resolved_fb = 0
        for f in fb_data:
            total_fb += f["count"]
            unread_fb += f.get("unread", 0)
            if f["_id"] == "NEW":
                new_fb = f["count"]
            elif f["_id"] == "RESOLVED":
                resolved_fb = f["count"]
                
        category_pipeline = [
            {"$match": {"projectId": project_id, "createdAt": {"$gte": start_time}}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        cat_cursor = db.feedback.aggregate(category_pipeline)
        cat_data = await cat_cursor.to_list(length=100)
        category_breakdown = {c["_id"]: c["count"] for c in cat_data}
        
        feedback_analytics = FeedbackAnalytics(
            totalFeedback=total_fb,
            newFeedback=new_fb,
            unreadFeedback=unread_fb,
            resolvedFeedback=resolved_fb,
            categoryBreakdown=category_breakdown
        )

        # 5. Health Score
        health_score = 100
        health_status = "Healthy"
        
        if not has_data:
            health_status = "Collecting data"
        else:
            if uptime_pct < 99.0:
                health_score -= 10
            if uptime_pct < 95.0:
                health_score -= 20
                
            if active_incidents > 0:
                health_score -= (active_incidents * 20)
                
            if critical_groups > 0:
                health_score -= min(critical_groups * 5, 30)
                
            if performance.averageLatency > 1000:
                health_score -= 10
                
            health_score = max(0, health_score) # floor at 0
            
            if health_score >= 90:
                health_status = "Healthy"
            elif health_score >= 70:
                health_status = "Degraded"
            else:
                health_status = "Critical"
                
        health_analytics = HealthAnalytics(score=health_score, status=health_status)

        return AnalyticsOverviewResponse(
            projectId=project_id,
            timeRange=time_range,
            health=health_analytics,
            uptime=uptime,
            performance=performance,
            incidents=incident_analytics,
            errors=error_analytics,
            feedback=feedback_analytics
        )
