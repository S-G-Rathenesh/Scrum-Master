import io
import zipfile
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.api.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.database.mongodb import get_database
from bson import ObjectId
from app.services.enrollment_service import create_enrollment_credential

from app.core.config import settings

router = APIRouter()

README_TEMPLATE = """# Scrum Master Integration Layer

This package connects your existing application to the Scrum Master centralized observability dashboard.

## Overview
The Scrum Master Integration Agent provides a lightweight, secure heartbeat and status reporting mechanism. It allows your application to register as "connected" without sending sensitive business data, source code, or exposing database credentials.

## Setup Instructions

1. Move the `scrum-master/` folder into the root of your existing application repository.
2. Configure the environment variables shown in `scrum-master.config.example` (or add them to your application `.env`).
3. Provide the prompt in `SCRUM_MASTER_INSTRUCTIONS.md` to your AI coding agent (like Antigravity) to help you seamlessly integrate it without breaking your existing setup.
"""

CONFIG_EXAMPLE_TEMPLATE = """# Add these to your application environment configuration (e.g. .env)
# Do NOT commit your actual .env file containing tokens to version control!

# The URL of your Scrum Master instance
SCRUM_MASTER_URL=__BACKEND_URL__

# The secure integration token or enrollment credential
SCRUM_MASTER_TOKEN=your_token_here

# Optional metadata overrides (autodetected if omitted)
# SCRUM_MASTER_APPLICATION_NAME=My Existing App
# SCRUM_MASTER_ENVIRONMENT=development
"""

AGENT_TEMPLATE_NODE = """// scrum-master-agent.js
// Framework-Agnostic Standalone Integration Agent for Scrum Master

const fs = require('fs');
const path = require('path');

class ScrumMasterAgent {
  constructor(options = {}) {
    this.token = options.token || process.env.SCRUM_MASTER_TOKEN;
    this.baseUrl = options.serverUrl || process.env.SCRUM_MASTER_URL || '__BACKEND_URL__';
    this.metadata = options.metadata || this._discoverMetadata();
    this.bufferSize = options.bufferSize || 100;
    this.errorBuffer = [];
    this.feedbackBuffer = [];
    this.isFlushing = false;
    this.isFlushingFeedback = false;
  }

  _discoverMetadata() {
    let appName = process.env.SCRUM_MASTER_APPLICATION_NAME;
    let framework = process.env.SCRUM_MASTER_FRAMEWORK;
    let backendTech = process.env.SCRUM_MASTER_BACKEND;
    const environment = process.env.SCRUM_MASTER_ENVIRONMENT || process.env.NODE_ENV || 'development';

    if (!appName) {
      try {
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.name) appName = pkg.name;
        }
      } catch (e) {}
    }

    if (!appName) {
      appName = path.basename(process.cwd()) || 'Connected Application';
    }

    if (!framework) {
      try {
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps.next) framework = 'Next.js';
          else if (deps.react) framework = 'React';
          else if (deps.vue) framework = 'Vue';
          else if (deps.express) framework = 'Express';
        }
      } catch (e) {}
    }

    if (!backendTech) {
      if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
        backendTech = 'Node.js';
      } else if (fs.existsSync(path.resolve(process.cwd(), 'requirements.txt')) || fs.existsSync(path.resolve(process.cwd(), 'main.py'))) {
        backendTech = 'Python';
      }
    }

    return {
      name: appName,
      application_name: appName,
      framework: framework || 'Node.js',
      backend: backendTech || 'Node.js',
      environment: environment
    };
  }

  async connect() {
    if (!this.token) {
      try {
        const tokenPath = path.resolve(process.cwd(), '.scrum-master', 'token');
        if (fs.existsSync(tokenPath)) {
          this.token = fs.readFileSync(tokenPath, 'utf8').trim();
        }
      } catch (e) {}
    }

    if (!this.token) {
      console.warn('[Scrum Master] No integration token provided. Agent is disabled.');
      return;
    }

    console.log(`[Scrum Master] Connecting agent for "${this.metadata.name}" to ${this.baseUrl}...`);
    this.startHeartbeat();
    this.startErrorFlusher();

    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async _performHeartbeat() {
    try {
      const isEnrollment = this.token && this.token.startsWith('sm_enroll_');
      const endpoint = isEnrollment ? `${this.baseUrl}/api/v1/integration/enroll` : `${this.baseUrl}/api/v1/integration/heartbeat`;
      
      const payload = isEnrollment ? {
        application_name: this.metadata.name,
        framework: this.metadata.framework,
        backend: this.metadata.backend,
        environment: this.metadata.environment,
        agent_version: '1.2.0',
        metadata: this.metadata
      } : {
        agentVersion: '1.2.0',
        metadata: this.metadata
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.projectToken && data.projectToken !== this.token) {
           this.token = data.projectToken;
           try {
             const dirPath = path.resolve(process.cwd(), '.scrum-master');
             if (!fs.existsSync(dirPath)) {
               fs.mkdirSync(dirPath, { recursive: true });
             }
             const tokenPath = path.join(dirPath, 'token');
             fs.writeFileSync(tokenPath, this.token, { mode: 0o600 });
             console.log('[Scrum Master] Application enrolled & secured successfully.');
           } catch (e) {
             console.warn('[Scrum Master] Cached token in-memory.');
           }
        }
      }
    } catch (err) {
      // Silent failure to avoid crashing host application
    }
  }

  startHeartbeat() {
    this._performHeartbeat();
    this.heartbeatInterval = setInterval(() => this._performHeartbeat(), 10000);
  }
  
  captureException(error, context = {}) {
    if (!error) return;
    
    const payload = {
      errorType: error.name || 'Error',
      message: error.message || String(error),
      severity: 'ERROR',
      source: 'backend',
      environment: context.environment || this.metadata.environment || 'production',
      stackTrace: error.stack || null,
      ...context
    };
    
    this._queueError(payload);
  }
  
  _queueError(payload) {
    if (this.errorBuffer.length >= this.bufferSize) {
      this.errorBuffer.shift();
    }
    this.errorBuffer.push(payload);
  }
  
  startErrorFlusher() {
    this.errorInterval = setInterval(() => this._flushErrors(), 5000);
  }
  
  async _flushErrors() {
    if (this.isFlushing || this.errorBuffer.length === 0 || !this.token || this.token.startsWith('sm_enroll_')) return;
    
    this.isFlushing = true;
    const batch = [...this.errorBuffer];
    this.errorBuffer = [];
    
    try {
      for (const errorPayload of batch) {
        await fetch(`${this.baseUrl}/api/v1/integration/errors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(errorPayload)
        });
      }
    } catch (err) {
      for (const e of batch) {
         this._queueError(e);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  async sendFeedback(feedbackData = {}) {
    if (!this.token || this.token.startsWith('sm_enroll_')) {
      return { ok: false, error: 'Integration token not configured. Please wait for application signal handshake.' };
    }

    try {
      const payload = {
        email: feedbackData.email,
        message: feedbackData.message,
        name: feedbackData.name || null,
        subject: feedbackData.subject || null,
        category: feedbackData.category || 'GENERAL',
        source: feedbackData.source || 'IN_APP',
        pageUrl: feedbackData.pageUrl || null
      };

      const res = await fetch(`${this.baseUrl}/api/v1/integration/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        return { ok: true, feedbackId: data.feedbackId };
      } else {
        return { ok: false, error: 'Unable to send feedback right now. Please try again later.' };
      }
    } catch (err) {
      return { ok: false, error: 'Unable to send feedback right now. Please try again later.' };
    }
  }

  stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.errorInterval) clearInterval(this.errorInterval);
  }
}

// Auto-start if executed directly via Node.js CLI: node scrum-master/scrum-master-agent.js
if (require.main === module) {
  const agent = new ScrumMasterAgent();
  agent.connect();
}

module.exports = ScrumMasterAgent;
"""

ANTIGRAVITY_INSTRUCTIONS = """I have added a `scrum-master/` folder to the root of this existing application.

Integrate Scrum Master into this application using the files and instructions inside:

`scrum-master/`

IMPORTANT RULES:

1. First inspect the existing application structure.
2. Read:
   - `scrum-master/SCRUM_MASTER_INSTRUCTIONS.md`
   - `scrum-master/README.md`
   - `scrum-master/scrum-master.config.example`
3. Identify the application's:
   - name
   - framework
   - language
   - backend
   - package manager
   - development/start commands
   - appropriate integration/startup point
4. Do NOT replace, rewrite, or restructure the existing application.
5. Do NOT remove existing dependencies or functionality.
6. Do NOT change existing authentication, routing, database logic, APIs, or business logic unless required specifically for Scrum Master integration.
7. Keep Scrum Master isolated as a lightweight observability integration.
8. Use `scrum-master/scrum-master-agent.js` as the core Scrum Master agent.
9. Configure the agent using environment variables rather than hardcoding credentials.
10. Never hardcode MongoDB credentials, JWT secrets, API keys, passwords, or other sensitive values.
11. Preserve the existing application startup and development workflow.
12. If the application uses Node.js, integrate the agent using the least invasive appropriate startup mechanism.
13. If the application has a separate backend, prefer running the Scrum Master agent alongside the backend rather than modifying frontend business logic.
14. If the application uses another language/framework, keep the Scrum Master agent as an independent Node.js process when possible instead of forcing framework-specific changes.
15. Do not expose the Scrum Master enrollment token to the frontend/browser unnecessarily.
16. Do not create fake telemetry, fake heartbeat events, or fake project data.
17. Start the Scrum Master agent using the actual application's environment/configuration.
18. Verify that the agent successfully enrolls with Scrum Master.
19. Verify that the agent sends a real heartbeat.
20. If an integration decision is ambiguous, inspect the existing project and choose the least invasive solution rather than asking me to rewrite the application.

After integration:

- explain what files were changed
- explain how the Scrum Master agent is started
- verify the application still starts normally
- verify the Scrum Master agent is running
- verify enrollment succeeded
- verify a heartbeat was received
- do not claim success unless these checks actually pass

The application's existing behavior must remain unchanged.
"""

async def _build_zip_package(user_id: str, project_id: Optional[str] = None) -> Tuple[io.BytesIO, str]:
    db = get_database()
    
    # Generate user-scoped temporary enrollment credential
    raw_token = await create_enrollment_credential(user_id)
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("scrum-master/README.md", README_TEMPLATE)
        zip_file.writestr("scrum-master/SCRUM_MASTER_INSTRUCTIONS.md", ANTIGRAVITY_INSTRUCTIONS)
        config_content = CONFIG_EXAMPLE_TEMPLATE.replace("your_token_here", raw_token).replace("__BACKEND_URL__", settings.BACKEND_URL)
        zip_file.writestr("scrum-master/scrum-master.config.example", config_content)
        agent_content = AGENT_TEMPLATE_NODE.replace("__BACKEND_URL__", settings.BACKEND_URL)
        zip_file.writestr("scrum-master/scrum-master-agent.js", agent_content)
        
    zip_buffer.seek(0)
    filename = "scrum-master.zip"
    return zip_buffer, filename


@router.get("/enrollment-package")
async def download_enrollment_package_query(
    project_id: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    zip_buffer, filename = await _build_zip_package(current_user.id, project_id)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/download")
async def download_integration_package_endpoint(
    project_id: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    zip_buffer, filename = await _build_zip_package(current_user.id, project_id)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/setup-status")
async def get_setup_status(
    current_user: UserResponse = Depends(get_current_user)
):
    db = get_database()
    # Get the latest enrollment credential for this user
    latest_enrollment = await db.enrollments.find_one(
        {"ownerId": current_user.id},
        sort=[("createdAt", -1)]
    )
    
    if not latest_enrollment:
        return {
            "has_pending_setup": False,
            "step": 1,
            "status": "WAITING",
            "enrollment_id": None,
            "project_id": None
        }
        
    enrollment_id = str(latest_enrollment["_id"])
    
    if not latest_enrollment.get("used"):
        return {
            "has_pending_setup": True,
            "step": 4,
            "status": "WAITING",
            "enrollment_id": enrollment_id,
            "project_id": None
        }
        
    project_id = latest_enrollment.get("projectId")
    if not project_id:
        return {
            "has_pending_setup": True,
            "step": 4,
            "status": "WAITING",
            "enrollment_id": enrollment_id,
            "project_id": None
        }
        
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        return {
            "has_pending_setup": True,
            "step": 4,
            "status": "WAITING",
            "enrollment_id": enrollment_id,
            "project_id": project_id
        }
        
    return {
        "has_pending_setup": False,
        "step": 4,
        "status": "CREATED",
        "enrollment_id": enrollment_id,
        "projectId": str(project["_id"]),
        "name": project.get("name"),
        "framework": project.get("framework"),
        "backend": project.get("backend"),
        "environment": project.get("environment"),
        "lastConnectedAt": project.get("lastConnectedAt")
    }
