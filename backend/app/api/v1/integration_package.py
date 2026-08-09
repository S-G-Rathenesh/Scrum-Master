import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.api.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.database.mongodb import get_database
from bson import ObjectId
from app.services.enrollment_service import create_enrollment_credential

router = APIRouter()

README_TEMPLATE = """# Scrum Master Integration

This package connects your existing project to the Scrum Master centralized dashboard.

## Overview
The Scrum Master Integration Agent provides a lightweight, secure heartbeat and status reporting mechanism. It allows your project to register as "connected" without sending sensitive business data, source code, or exposing database credentials.

## Setup Instructions

1. Add `scrum-master-agent.js` to your project (if you are using Node.js/Express) OR adapt the logic to your backend framework.
2. Configure the environment variables shown in `scrum-master.config.example`.
3. Provide the `ANTIGRAVITY_INTEGRATION.md` instructions to your AI coding agent (like Antigravity) to help you seamlessly integrate it without breaking your existing setup.
"""

CONFIG_EXAMPLE_TEMPLATE = """# Add these to your environment configuration (e.g. .env)
# Do NOT commit your actual .env file to version control!

# The URL of your Scrum Master instance
SCRUM_MASTER_URL=https://api.scrummaster.rathenesh.dev

# The secure integration token for this specific project
SCRUM_MASTER_TOKEN=your_token_here
"""

AGENT_TEMPLATE_NODE = """// scrum-master-agent.js
// A lightweight Node.js/Express integration for Scrum Master

class ScrumMasterAgent {
  constructor(options = {}) {
    this.token = options.token || process.env.SCRUM_MASTER_TOKEN;
    this.baseUrl = options.serverUrl || process.env.SCRUM_MASTER_URL || 'https://api.scrummaster.rathenesh.dev';
    this.metadata = options.metadata || {};
    this.bufferSize = options.bufferSize || 100;
    this.errorBuffer = [];
    this.feedbackBuffer = [];
    this.isFlushing = false;
    this.isFlushingFeedback = false;
  }

  async connect() {
    // If the token is missing from options/env, try to load from local cache file
    if (!this.token) {
      try {
        const fs = require('fs');
        const path = require('path');
        const tokenPath = path.resolve(process.cwd(), '.scrum-master', 'token');
        if (fs.existsSync(tokenPath)) {
          this.token = fs.readFileSync(tokenPath, 'utf8').trim();
        }
      } catch (e) {
        // Ignore cache read errors
      }
    }

    if (!this.token) {
      console.warn('[Scrum Master] No integration token provided. Agent is disabled.');
      return;
    }

    console.log(`[Scrum Master] Connecting agent to ${this.baseUrl}...`);
    this.startHeartbeat();
    this.startErrorFlusher();
    this.startFeedbackFlusher();
  }

  async _performHeartbeat() {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/integration/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          agentVersion: '1.2.0',
          metadata: this.metadata
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.projectToken && data.projectToken !== this.token) {
           this.token = data.projectToken;
           try {
             const fs = require('fs');
             const path = require('path');
             const dirPath = path.resolve(process.cwd(), '.scrum-master');
             if (!fs.existsSync(dirPath)) {
               fs.mkdirSync(dirPath, { recursive: true });
             }
             const tokenPath = path.join(dirPath, 'token');
             fs.writeFileSync(tokenPath, this.token, { mode: 0o600 });
             console.log('[Scrum Master] Project successfully enrolled and secured.');
           } catch (e) {
             console.warn('[Scrum Master] Failed to cache permanent token. Using in-memory.');
           }
        }
      }
    } catch (err) {
      // Silent failure for heartbeat
    }
  }

  startHeartbeat() {
    this._performHeartbeat();
    this.heartbeatInterval = setInterval(() => this._performHeartbeat(), 60000);
  }
  
  // --- ERROR REPORTING ---
  
  captureException(error, context = {}) {
    if (!error) return;
    
    const payload = {
      errorType: error.name || 'Error',
      message: error.message || String(error),
      severity: 'ERROR',
      source: 'backend', // Overridable via context
      environment: context.environment || 'production',
      stackTrace: error.stack || null,
      ...context
    };
    
    this._queueError(payload);
  }
  
  captureMessage(message, severity = 'INFO', context = {}) {
    const payload = {
      errorType: 'LogMessage',
      message: String(message),
      severity: severity,
      source: 'backend',
      environment: context.environment || 'production',
      ...context
    };
    
    this._queueError(payload);
  }
  
  _queueError(payload) {
    if (this.errorBuffer.length >= this.bufferSize) {
      // Drop oldest if buffer full
      this.errorBuffer.shift();
    }
    this.errorBuffer.push(payload);
  }
  
  startErrorFlusher() {
    // Flush errors every 5 seconds if available
    this.errorInterval = setInterval(() => this._flushErrors(), 5000);
  }
  
  async _flushErrors() {
    if (this.isFlushing || this.errorBuffer.length === 0 || !this.token) return;
    
    this.isFlushing = true;
    const batch = [...this.errorBuffer];
    this.errorBuffer = [];
    
    try {
      // In a more complex agent we would send a batch array, 
      // but for Phase 4 we send them individually in a non-blocking loop 
      // to the /errors endpoint.
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
      // If we failed to send (e.g. network down), push them back to buffer 
      // (ensuring we don't exceed max size)
      for (const e of batch) {
         this._queueError(e);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  // --- FEEDBACK REPORTING ---
  
  submitFeedback(feedbackData) {
    if (!feedbackData || !feedbackData.message) {
      console.warn('[Scrum Master] Feedback requires at least a message field.');
      return;
    }
    
    const payload = {
      name: feedbackData.name || null,
      email: feedbackData.email || null,
      subject: feedbackData.subject || null,
      message: String(feedbackData.message).substring(0, 5000),
      category: feedbackData.category || 'GENERAL',
      source: feedbackData.source || 'IN_APP',
      pageUrl: feedbackData.pageUrl || (typeof window !== 'undefined' ? window.location.href : null)
    };
    
    this._queueFeedback(payload);
  }
  
  _queueFeedback(payload) {
    if (this.feedbackBuffer.length >= 50) {
      this.feedbackBuffer.shift();
    }
    this.feedbackBuffer.push(payload);
  }
  
  startFeedbackFlusher() {
    this.feedbackInterval = setInterval(() => this._flushFeedback(), 5000);
  }
  
  async _flushFeedback() {
    if (this.isFlushingFeedback || this.feedbackBuffer.length === 0 || !this.token) return;
    
    this.isFlushingFeedback = true;
    const batch = [...this.feedbackBuffer];
    this.feedbackBuffer = [];
    
    try {
      for (const feedbackPayload of batch) {
        await fetch(`${this.baseUrl}/api/v1/integration/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(feedbackPayload)
        });
      }
    } catch (err) {
      for (const f of batch) {
         this._queueFeedback(f);
      }
    } finally {
      this.isFlushingFeedback = false;
    }
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.errorInterval) {
      clearInterval(this.errorInterval);
    }
    if (this.feedbackInterval) {
      clearInterval(this.feedbackInterval);
    }
  }
}

// Example Express usage:
// const agent = new ScrumMasterAgent();
// agent.connect();

module.exports = ScrumMasterAgent;
"""

ANTIGRAVITY_INSTRUCTIONS = """# Scrum Master Integration Instructions for Antigravity

I would like you to integrate the Scrum Master monitoring agent into this project.

## Goal
The goal is to safely add a periodic "heartbeat" to my application backend so Scrum Master recognizes it as connected.

## Requirements
1. **Analyze First**: Look at my backend code (e.g. `server.js`, `app.py`, `main.py`). Identify the framework (Express, FastAPI, Django, etc).
2. **Adapt the Agent**: If I am using Node.js, you can use the provided `scrum-master-agent.js`. If I am using another framework, please rewrite the logic in `scrum-master-agent.js` into a lightweight, non-blocking background task in my language (e.g., Python `asyncio.create_task`, or threading).
3. **Environment Variables**: Use `SCRUM_MASTER_TOKEN` and `SCRUM_MASTER_URL`. Add them to `.env.example` but DO NOT commit my actual `.env` file containing the token.
4. **Safety**: Scrum Master is an *external monitoring service*. If it goes down, my application MUST NOT crash. Ensure the heartbeat has short timeouts (e.g. 5s) and catches exceptions silently without breaking the main app flow.
5. **Ignore File**: Ensure `.scrum-master/` is added to my `.gitignore` file to prevent accidental commit of permanent tokens.
6. **Additive Changes**: Do not rewrite my existing routing, database, or authentication logic. Just import the agent and call `start()` during application startup.

Please proceed to integrate it and let me know when it's done so I can test the connection!
"""

@router.get("/enrollment-package")
async def download_enrollment_package(
    current_user: UserResponse = Depends(get_current_user)
):
    raw_token = await create_enrollment_credential(current_user.id)
    
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("README.md", README_TEMPLATE)
        config_content = CONFIG_EXAMPLE_TEMPLATE.replace("your_token_here", raw_token)
        zip_file.writestr("scrum-master.config.example", config_content)
        zip_file.writestr("integration/scrum-master-agent.js", AGENT_TEMPLATE_NODE)
        zip_file.writestr("instructions/ANTIGRAVITY_INTEGRATION.md", ANTIGRAVITY_INSTRUCTIONS)
        
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=scrum-master-integration-package.zip"
        }
    )


@router.get("/download")
async def download_integration_package(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    db = get_database()
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": obj_id, "ownerId": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("README.md", README_TEMPLATE)
        zip_file.writestr("scrum-master.config.example", CONFIG_EXAMPLE_TEMPLATE)
        zip_file.writestr("integration/scrum-master-agent.js", AGENT_TEMPLATE_NODE)
        zip_file.writestr("instructions/ANTIGRAVITY_INTEGRATION.md", ANTIGRAVITY_INSTRUCTIONS)
        
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=scrum-master-integration-{project['name'].replace(' ', '_')}.zip"
        }
    )
