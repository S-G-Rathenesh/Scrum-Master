// scrum-master-agent.js
// Framework-Agnostic Standalone Integration Agent for Scrum Master

const fs = require('fs');
const path = require('path');

class ScrumMasterAgent {
  constructor(options = {}) {
    this.token = options.token || null;
    this.baseUrl = options.serverUrl || process.env.SCRUM_MASTER_URL || 'https://api.scrummaster.rathenesh.dev';
    this.metadata = options.metadata || this._discoverMetadata();
    this.bufferSize = options.bufferSize || 100;
    this.errorBuffer = [];
    this.feedbackBuffer = [];
    this.isFlushing = false;
    this.isFlushingFeedback = false;

    if (!this.token) {
      try {
        const tokenPath = path.resolve(process.cwd(), '.scrum-master', 'token');
        if (fs.existsSync(tokenPath)) {
          this.token = fs.readFileSync(tokenPath, 'utf8').trim();
          if (this.token) console.log('[Scrum Master] Loaded cached project token.');
        }
      } catch (e) {}
    }

    if (!this.token && process.env.SCRUM_MASTER_TOKEN) {
      this.token = process.env.SCRUM_MASTER_TOKEN;
      console.log('[Scrum Master] No cached project token found; using enrollment credential.');
    }
  }

  _discoverMetadata() {
    let appName = process.env.SCRUM_MASTER_APPLICATION_NAME;
    let framework = process.env.SCRUM_MASTER_FRAMEWORK;
    let backendTech = process.env.SCRUM_MASTER_BACKEND;
    const environment = process.env.SCRUM_MASTER_ENVIRONMENT || process.env.NODE_ENV || 'development';
    const frontendUrl = process.env.SCRUM_MASTER_FRONTEND_URL || null;
    const backendUrl = process.env.SCRUM_MASTER_BACKEND_URL || null;

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
      environment: environment,
      frontendUrl: frontendUrl,
      backendUrl: backendUrl
    };
  }

  async connect() {
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
      
      if (isEnrollment) {
        console.log(`[Scrum Master] Attempting enrollment handshake with ${endpoint}...`);
      }

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
        if (isEnrollment) {
          console.log('[Scrum Master] Enrollment handshake successful! Project ID:', data.projectId);
        }
        if (data.projectToken && data.projectToken !== this.token) {
           this.token = data.projectToken;
           try {
             const dirPath = path.resolve(process.cwd(), '.scrum-master');
             if (!fs.existsSync(dirPath)) {
               fs.mkdirSync(dirPath, { recursive: true });
             }
             const tokenPath = path.join(dirPath, 'token');
             fs.writeFileSync(tokenPath, this.token, { mode: 0o600 });
             console.log('[Scrum Master] Application enrolled & secured successfully. Project token persisted.');
           } catch (e) {
             console.warn('[Scrum Master] Failed to persist project token to disk. Cached in-memory.');
           }
        } else if (!isEnrollment) {
           // Normal heartbeat success doesn't need to log continuously
        }
      } else {
        if (isEnrollment) {
          const errText = await res.text();
          console.error(`[Scrum Master] Enrollment failed (HTTP ${res.status}):`, errText);
        } else {
          // A 401 on heartbeat means the token was revoked or invalid
          if (res.status === 401) {
             console.error(`[Scrum Master] Heartbeat rejected (HTTP 401). Project token may be revoked.`);
          }
        }
      }
    } catch (err) {
      if (this.token && this.token.startsWith('sm_enroll_')) {
        console.error('[Scrum Master] Enrollment request failed:', err.message);
      }
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
