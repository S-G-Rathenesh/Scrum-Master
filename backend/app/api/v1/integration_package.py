import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.api.dependencies import get_current_user
from app.schemas.user import UserResponse
from app.database.mongodb import get_database
from bson import ObjectId

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

const https = require('https');
const http = require('http');
const { URL } = require('url');

class ScrumMasterAgent {
  constructor(options = {}) {
    this.token = options.token || process.env.SCRUM_MASTER_TOKEN;
    this.serverUrl = options.serverUrl || process.env.SCRUM_MASTER_URL || 'https://api.scrummaster.rathenesh.dev';
    this.intervalMs = options.intervalMs || 60000; // default 60 seconds
    this.agentVersion = '1.0.0';
    
    this.timer = null;
  }

  start() {
    if (!this.token) {
      console.warn('[Scrum Master] Integration agent disabled: SCRUM_MASTER_TOKEN not provided.');
      return;
    }
    
    console.log(`[Scrum Master] Integration agent started. Heartbeat every ${this.intervalMs}ms.`);
    
    // Initial heartbeat
    this.sendHeartbeat();
    
    // Recurring heartbeat
    this.timer = setInterval(() => this.sendHeartbeat(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  sendHeartbeat() {
    const payload = JSON.stringify({
      agentVersion: this.agentVersion
    });

    try {
      const url = new URL(`${this.serverUrl}/api/v1/integration/heartbeat`);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 5000 // Short timeout to prevent blocking
      }, (res) => {
        // We do not strictly care about the response to avoid crashing user apps
        res.on('data', () => {}); 
        if (res.statusCode === 401) {
          console.error('[Scrum Master] Integration token is invalid or revoked.');
          this.stop(); // Stop pinging if permanently revoked
        }
      });

      req.on('error', (e) => {
        // Silently fail or log debug to avoid crashing the main application
        // console.debug('[Scrum Master] Heartbeat failed:', e.message);
      });

      req.on('timeout', () => {
        req.destroy();
      });

      req.write(payload);
      req.end();
    } catch (e) {
      // Catch URL parsing errors or unexpected issues
      console.error('[Scrum Master] Agent error:', e.message);
    }
  }
}

// Example Express usage:
// const agent = new ScrumMasterAgent();
// agent.start();

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
5. **Additive Changes**: Do not rewrite my existing routing, database, or authentication logic. Just import the agent and call `start()` during application startup.

Please proceed to integrate it and let me know when it's done so I can test the connection!
"""

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
