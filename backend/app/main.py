from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.monitoring import MonitoringScheduler
from app.core.config import settings

from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.health import router as health_router
from app.api.v1.members import router as members_router
from app.api.v1.monitoring import router as monitoring_router
from app.api.v1.integration_management import router as integration_management_router
from app.api.v1.integration_agent import router as integration_agent_router
from app.api.v1.integration_package import router as integration_package_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    
    # Start the monitoring scheduler in the background
    scheduler = MonitoringScheduler()
    await scheduler.start()
    
    yield
    
    # Shutdown
    await scheduler.stop()
        
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:5173", # Vite dev server
    "https://scrummaster.rathenesh.dev"
]

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
app.include_router(members_router, prefix="/api/v1/members", tags=["members"])
app.include_router(integration_management_router, prefix="/api/v1/projects/{project_id}/integration", tags=["integration-management"])
app.include_router(integration_package_router, prefix="/api/v1/projects/{project_id}/integration", tags=["integration-package"])
app.include_router(integration_agent_router, prefix="/api/v1/integration", tags=["integration-agent"])
