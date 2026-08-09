import asyncio
from datetime import datetime, timezone
import uuid
import logging
import httpx
from typing import Set, Tuple
from datetime import timedelta
from app.database.mongodb import get_database
from app.monitoring.checker import perform_safe_check
from app.monitoring.incident_manager import evaluate_incident
from app.schemas.project import IntegrationStatus

logger = logging.getLogger(__name__)

class MonitoringScheduler:
    """
    Independent Monitoring Scheduler class that orchestrates checking logic.
    Provides clean start/stop methods for lifecycle management.
    """
    def __init__(self, max_concurrent_checks: int = 20):
        self.max_concurrent_checks = max_concurrent_checks
        self._running = False
        self._task = None
        self._client: httpx.AsyncClient = None
        
        # In-memory duplicate protection: tracks (project_id, target)
        self._active_checks: Set[Tuple[str, str]] = set()

    async def start(self):
        """Starts the scheduler background loop and initializes resources."""
        if self._running:
            return
            
        logger.info("Starting MonitoringScheduler...")
        self._running = True
        
        # Initialize reusable HTTP client with connection pooling
        limits = httpx.Limits(max_keepalive_connections=self.max_concurrent_checks, max_connections=self.max_concurrent_checks * 2)
        self._client = httpx.AsyncClient(limits=limits)
        
        self._task = asyncio.create_task(self._scheduler_loop())

    async def stop(self):
        """Stops the scheduler, cancels pending tasks, and releases resources."""
        logger.info("Stopping MonitoringScheduler...")
        self._running = False
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
                
        if self._client:
            await self._client.aclose()
            self._client = None
            
        logger.info("MonitoringScheduler stopped successfully.")

    async def _perform_check_safe(self, project: dict, target: str, url: str, semaphore: asyncio.Semaphore):
        """
        Executes a single check, strictly isolated from other checks.
        Uses duplicate protection and catches all exceptions.
        """
        project_id = project["_id"]
        check_key = (project_id, target)
        
        if check_key in self._active_checks:
            logger.debug(f"Skipping duplicate check for {check_key}")
            return "unknown"
            
        self._active_checks.add(check_key)
        
        try:
            async with semaphore:
                db = get_database()
                if db is None:
                    return "unknown"
                    
                # Strict timeout validation
                timeout = min(max(project.get("requestTimeout", 10), 1), 30)
                
                result = await perform_safe_check(self._client, url, timeout)
                
                now = datetime.now(timezone.utc)
                check_doc = {
                    "_id": str(uuid.uuid4()),
                    "projectId": project_id,
                    "target": target,
                    "status": result["status"],
                    "statusCode": result["statusCode"],
                    "responseTime": result["responseTime"],
                    "errorType": result["errorType"],
                    "errorMessage": result["errorMessage"],
                    "checkedAt": now
                }
                
                await db.monitoring_checks.insert_one(check_doc)
                await evaluate_incident(db, project_id, target, result["status"], result["errorMessage"])
                
                return result["status"]
                
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Isolated failure during check for project {project_id}, target {target}: {e}", exc_info=True)
            return "unknown"
        finally:
            self._active_checks.remove(check_key)

    async def _run_monitoring_cycle(self):
        """Discovers due projects and dispatches check tasks."""
        try:
            db = get_database()
            if db is None:
                return
                
            now = datetime.now(timezone.utc)
            projects_cursor = db.projects.find({"monitoringEnabled": True})
            
            tasks = []
            semaphore = asyncio.Semaphore(self.max_concurrent_checks)
            projects_to_update = []
            
            async for project in projects_cursor:
                last_checked_at = project.get("lastCheckedAt")
                # Enforce minimum interval of 60s
                interval = max(project.get("monitoringInterval", 300), 60)
                
                if not last_checked_at or (now - last_checked_at.replace(tzinfo=timezone.utc)).total_seconds() >= interval:
                    
                    project_id = project["_id"]
                    frontend_url = project.get("frontendUrl")
                    backend_url = project.get("backendUrl")
                    
                    check_tasks = []
                    if frontend_url:
                        check_tasks.append(self._perform_check_safe(project, "frontend", frontend_url, semaphore))
                    if backend_url:
                        check_tasks.append(self._perform_check_safe(project, "backend", backend_url, semaphore))
                        
                    if check_tasks:
                        tasks.append({
                            "project_id": project_id,
                            "futures": asyncio.gather(*check_tasks, return_exceptions=True)
                        })
                        
            # Wait for all checks in this cycle
            for task_info in tasks:
                results = await task_info["futures"]
                
                overall_status = "up"
                for res in results:
                    if isinstance(res, Exception):
                        overall_status = "error"
                    elif res == "down":
                        overall_status = "down"
                    elif res == "degraded" and overall_status != "down":
                        overall_status = "degraded"
                        
                projects_to_update.append((task_info["project_id"], overall_status))
                
            # Bulk update
            for pid, status in projects_to_update:
                await db.projects.update_one(
                    {"_id": pid},
                    {"$set": {
                        "lastCheckedAt": now,
                        "monitoringStatus": status
                    }}
                )
                
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Error in monitoring scheduler cycle: {e}", exc_info=True)

    async def _sweep_stale_integrations(self):
        """Finds integrations that have missed heartbeats and marks them disconnected."""
        try:
            db = get_database()
            if db is None:
                return
                
            now = datetime.now(timezone.utc)
            # Threshold: 3 minutes without a heartbeat
            threshold = now - timedelta(minutes=3)
            
            # Find connected integrations where lastHeartbeatAt < threshold
            # or connectedAt < threshold and lastHeartbeatAt is None
            stale_cursor = db.integrations.find({
                "status": IntegrationStatus.CONNECTED.value,
                "$or": [
                    {"lastHeartbeatAt": {"$lt": threshold}},
                    {"lastHeartbeatAt": None, "connectedAt": {"$lt": threshold}}
                ]
            })
            
            stale_project_ids = []
            async for doc in stale_cursor:
                stale_project_ids.append(doc["projectId"])
                
            if stale_project_ids:
                # Update integrations
                await db.integrations.update_many(
                    {"projectId": {"$in": stale_project_ids}},
                    {"$set": {
                        "status": IntegrationStatus.DISCONNECTED.value,
                        "updatedAt": now
                    }}
                )
                
                # Update projects
                await db.projects.update_many(
                    {"_id": {"$in": stale_project_ids}},
                    {"$set": {
                        "integrationStatus": IntegrationStatus.DISCONNECTED.value,
                        "updatedAt": now
                    }}
                )
                
                logger.info(f"Marked {len(stale_project_ids)} stale integrations as DISCONNECTED.")
                
        except Exception as e:
            logger.error(f"Error sweeping stale integrations: {e}", exc_info=True)

    async def _scheduler_loop(self):
        """Infinite loop polling for due checks."""
        try:
            while self._running:
                await self._run_monitoring_cycle()
                await self._sweep_stale_integrations()
                await asyncio.sleep(10)
        except asyncio.CancelledError:
            logger.info("Scheduler loop cancelled.")
