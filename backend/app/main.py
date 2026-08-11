from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import subprocess
import os
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.monitoring import MonitoringScheduler
from app.core.config import settings

agent_process = None

from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.health import router as health_router
from app.api.v1.members import router as members_router
from app.api.v1.monitoring import router as monitoring_router
from app.api.v1.integration_management import router as integration_management_router
from app.api.v1.integration_agent import router as integration_agent_router
from app.api.v1.integration_package import router as integration_package_router
from app.api.v1.errors import router as errors_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.notifications import router as notifications_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    
    # Start the monitoring scheduler in the background
    scheduler = MonitoringScheduler()
    await scheduler.start()
    
    # Start Scrum Master agent if configured
    global agent_process
    if settings.SCRUM_MASTER_TOKEN:
        agent_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../scrum-master/scrum-master-agent.js"))
        if os.path.exists(agent_path):
            agent_env = os.environ.copy()
            agent_env["SCRUM_MASTER_TOKEN"] = settings.SCRUM_MASTER_TOKEN
            agent_env["SCRUM_MASTER_URL"] = settings.SCRUM_MASTER_URL or "https://api.scrummaster.rathenesh.dev"
            agent_env["SCRUM_MASTER_FRONTEND_URL"] = settings.FRONTEND_URL or "http://localhost:5173"
            agent_env["SCRUM_MASTER_BACKEND_URL"] = settings.BACKEND_URL or "http://localhost:8000"
            agent_process = subprocess.Popen(["node", agent_path], env=agent_env)
            print(f"[Lifespan] Scrum Master Agent started with PID {agent_process.pid}")
        else:
            print(f"[Lifespan] Scrum Master Agent not found at {agent_path}")
    
    yield
    
    # Shutdown
    if agent_process:
        print("[Lifespan] Terminating Scrum Master Agent...")
        agent_process.terminate()
        try:
            agent_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            agent_process.kill()

    await scheduler.stop()
    
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS configuration
origins = [settings.FRONTEND_URL]

if settings.ENVIRONMENT == "development":
    origins.extend([
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router, prefix="/api/v1/health", tags=["health"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(monitoring_router, prefix="/api/v1/projects", tags=["monitoring"])
app.include_router(analytics_router, prefix="/api/v1/projects", tags=["analytics"])
app.include_router(notifications_router, prefix="/api/v1/projects", tags=["notifications"])
app.include_router(members_router, prefix="/api/v1", tags=["members"])
app.include_router(integration_management_router, prefix="/api/v1/projects/{project_id}/integration", tags=["integration-management"])
app.include_router(
    errors_router,
    prefix="/api/v1/projects/{project_id}/errors",
    tags=["errors"]
)
app.include_router(
    feedback_router,
    prefix="/api/v1/projects/{project_id}/feedback",
    tags=["feedback"]
)
app.include_router(integration_package_router, prefix="/api/v1/integration", tags=["integration-package"])
app.include_router(integration_agent_router, prefix="/api/v1/integration", tags=["integration-agent"])
