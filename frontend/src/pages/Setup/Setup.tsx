import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/common/Button';
import { SignalLine } from '../../components/common/SignalLine';
import { StatusIndicator } from '../../components/common/StatusIndicator';
import { Download, Copy, Check, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api';
import styles from './Setup.module.css';

/* ─────────────────────────────────────────────────────────────
   STATIC CONTENT
   ───────────────────────────────────────────────────────────── */

const PACKAGE_TREE = `scrum-master.zip
└── scrum-master/
    ├── scrum-master-agent.js
    ├── scrum-master.config.example
    ├── README.md
    └── SCRUM_MASTER_INSTRUCTIONS.md`;

const DIR_TREE = `my-existing-application/
├── src/
├── package.json
├── ...
└── scrum-master/
    ├── scrum-master-agent.js
    ├── scrum-master.config.example
    ├── README.md
    └── SCRUM_MASTER_INSTRUCTIONS.md`;

const ANTIGRAVITY_PROMPT = `I have added a \`scrum-master/\` folder to the root of this existing application.

Integrate Scrum Master into this application using the files inside the \`scrum-master/\` folder.

IMPORTANT RULES:

1. First inspect the entire existing application structure.
2. Read:
   - scrum-master/README.md
   - scrum-master/SCRUM_MASTER_INSTRUCTIONS.md
   - scrum-master/scrum-master-agent.js
   - scrum-master/scrum-master.config.example
3. Understand the existing framework, frontend, backend, package manager, scripts, entry points, and application startup flow before making changes.
4. Do NOT replace the existing application architecture.
5. Do NOT rewrite the application.
6. Do NOT remove existing functionality.
7. Do NOT modify unrelated application files.
8. Do NOT change existing authentication, routing, database logic, APIs, business logic, or UI unless required for Scrum Master integration.
9. Keep the Scrum Master integration isolated inside the \`scrum-master/\` directory whenever possible.
10. Configure the application to run the Scrum Master agent using the instructions provided in the integration package.
11. Use the provided Scrum Master configuration/enrollment mechanism.
12. Do NOT hard-code tokens, passwords, API keys, database credentials, or secrets into source code.
13. Use environment variables where configuration is required.
14. Preserve the application's existing development and production startup commands.
15. If a package/dependency is required, install only the minimum necessary dependency.
16. If the project already has an equivalent dependency or mechanism, reuse it instead of creating a duplicate.
17. Make the smallest safe changes required to connect Scrum Master.
18. Verify that the existing application still starts correctly after integration.
19. Verify that the Scrum Master agent can start alongside the existing application.
20. Do not claim success until the integration has actually been tested.

After integration:

- explain exactly which files were changed
- explain which command starts the Scrum Master agent
- explain any environment variables that must be configured
- start/restart the application if appropriate
- verify that the Scrum Master agent successfully enrolls with the Scrum Master server
- report the actual connection/enrollment result

The existing application must continue working exactly as before, with Scrum Master added as an observability/integration layer.`;

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */

interface DetectedApp {
  name: string;
  id: string;
  framework?: string;
  backend?: string;
  environment?: string;
  lastConnectedAt?: string;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────────────────────── */

export const Setup: React.FC = () => {
  const { currentProject, fetchProjects, selectProjectById } = useProjectStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const getStorageKey = useCallback(() => {
    return user ? `scrum_master_setup_state_${user.id}` : null;
  }, [user]);

  /* ── State ─────────────────────────────────────────────── */
  const [activeStep, setActiveStep] = useState<number>(() => {
    if (currentProject?.integrationStatus === 'CONNECTED') return 5;
    const key = user ? `scrum_master_setup_state_${user.id}` : null;
    if (key) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.activeStep) return parsed.activeStep;
        } catch (e) {}
      }
    }
    return 1;
  });
  const [handshakePhase, setHandshakePhase] = useState<'WAITING' | 'RECEIVED' | 'REGISTERING' | 'CREATED'>('WAITING');

  // Which steps are logically "done"
  const [stepsCompleted, setStepsCompleted] = useState<Record<number, boolean>>(() => {
    const key = user ? `scrum_master_setup_state_${user.id}` : null;
    if (key) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.stepsCompleted) return parsed.stepsCompleted;
        } catch (e) {}
      }
    }
    return {};
  });

  // Persist UI state to user-scoped local storage
  useEffect(() => {
    const key = getStorageKey();
    if (key && activeStep < 5) {
      localStorage.setItem(key, JSON.stringify({ activeStep, stepsCompleted }));
    }
  }, [activeStep, stepsCompleted, getStorageKey]);

  // Step 1
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Step 2 (manual mark)
  // Step 3
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedTree, setCopiedTree] = useState(false);

  // Step 4
  const [detectedApp, setDetectedApp] = useState<DetectedApp | null>(null);

  /* ── Sync from project store ───────────────────────────── */
  useEffect(() => {
    if (currentProject?.integrationStatus === 'CONNECTED') {
      setActiveStep(5);
      setStepsCompleted({ 1: true, 2: true, 3: true, 4: true });
    } else if (currentProject?.integrationStatus === 'WAITING' && activeStep < 4) {
      setActiveStep(4);
    }
  }, [currentProject]);

  /* ── Initial mount setup-status check ──────────────────────── */
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/integration/setup-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.status === 'CREATED' && activeStep < 5) {
          await fetchProjects();
          selectProjectById(data.projectId);
          if (data.integrationStatus === 'CONNECTED') {
            navigate('/dashboard');
          } else {
            setActiveStep(5);
            setStepsCompleted({ 1: true, 2: true, 3: true, 4: true });
            setHandshakePhase('CREATED');
          }
        } else if (data.has_pending_setup && data.status === 'WAITING') {
          // Restore the persistent state (Resume at Step 4)
          setActiveStep(4);
          setStepsCompleted({ 1: true, 2: true, 3: true });
        }
      } catch (err) {
        // ignore
      }
    };
    checkInitialStatus();
  }, [navigate, activeStep, currentProject]);

  /* ── Helpers ───────────────────────────────────────────── */

  const onSignalEstablished = useCallback((app: DetectedApp) => {
    setDetectedApp(app);
    setActiveStep(5);
    setStepsCompleted((prev) => ({ ...prev, 1: true, 2: true, 3: true, 4: true }));
  }, []);

  /* ── Handshake Polling (step ≥ 4) ──────────────────────── */
  useEffect(() => {
    let interval: number;

    if (activeStep >= 4 && activeStep <= 5) {
      console.log('[Setup] Starting setup-status polling...');
      const poll = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;

          const res = await fetch(`${API_BASE_URL}/integration/setup-status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (!res.ok) return;
          const data = await res.json();
          console.log(`[Setup] setup-status polling response: ${data.status}`, data);

          if (data.status === 'CREATED') {
            console.log(`[Setup] CREATED state detected! Project ID: ${data.projectId}`);
            
            if (data.integrationStatus === 'CONNECTED') {
              console.log('[Setup] Connection confirmed! Navigating to dashboard...');
              setTimeout(() => {
                navigate('/dashboard');
              }, 1000);
            }

            setHandshakePhase(prev => {
              if (prev === 'WAITING') {
                setTimeout(() => {
                  setHandshakePhase('REGISTERING');
                  setTimeout(() => {
                    setHandshakePhase('CREATED');
                    setTimeout(async () => {
                      await fetchProjects();
                      selectProjectById(data.projectId);
                      onSignalEstablished({
                        name: data.name,
                        id: data.projectId,
                        framework: data.framework,
                        backend: data.backend,
                        environment: data.environment,
                        lastConnectedAt: data.lastConnectedAt || new Date().toISOString(),
                      });
                    }, 800);
                  }, 1200);
                }, 800);
                return 'RECEIVED';
              }
              return prev;
            });
          }
        } catch {
          /* ignore transient */
        }
      };

      poll();
      interval = window.setInterval(poll, 3000);
    }

    return () => {
      if (interval) {
        console.log('[Setup] Stopping setup-status polling.');
        clearInterval(interval);
      }
    };
  }, [activeStep, fetchProjects, selectProjectById, navigate, onSignalEstablished]);

  const completeStep = useCallback(
    (step: number) => {
      setStepsCompleted((prev) => ({ ...prev, [step]: true }));
      if (activeStep <= step) setActiveStep(step + 1);
    },
    [activeStep],
  );

  /* ── Download ──────────────────────────────────────────── */
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const token = localStorage.getItem('token') || '';
      if (!token) throw new Error('Authentication session expired. Please sign in again.');

      // Determine true backend base URL, resolving relative URLs against the window origin, 
      // and stripping out /api/v1 to give the raw domain to the agent.
      let agentBaseUrl = API_BASE_URL;
      if (agentBaseUrl.startsWith('/')) {
         agentBaseUrl = window.location.origin + agentBaseUrl;
      }
      agentBaseUrl = agentBaseUrl.replace(/\/api\/v1\/?$/, '');

      const url = currentProject 
        ? `${API_BASE_URL}/integration/enrollment-package?project_id=${currentProject.id}&backend_url=${encodeURIComponent(agentBaseUrl)}`
        : `${API_BASE_URL}/integration/enrollment-package?backend_url=${encodeURIComponent(agentBaseUrl)}`;

      console.log(`[Setup] Requesting integration package. Injecting backend_url: ${agentBaseUrl}`);

      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let msg = 'Unable to download the Scrum Master integration package.';
        try {
          const err = await res.json();
          if (err.detail) msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        } catch {
          msg = `Server error (${res.status} ${res.statusText})`;
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'scrum-master.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      completeStep(1);
    } catch (e: any) {
      setDownloadError(e.message || 'Failed to download integration package.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(ANTIGRAVITY_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyTree = () => {
    navigator.clipboard.writeText(DIR_TREE);
    setCopiedTree(true);
    setTimeout(() => setCopiedTree(false), 2000);
  };

  /* ── Step indicator (number / check) ───────────────────── */
  const renderIndicator = (n: number) => {
    const done = stepsCompleted[n] || activeStep > n;
    const active = activeStep === n;
    return (
      <div
        className={`${styles.stepIndicator} ${done ? styles.stepCompleted : ''} ${active ? styles.stepActive : ''}`}
      >
        {done ? <Check size={14} /> : n}
      </div>
    );
  };

  /* ── Step status tag ───────────────────────────────────── */
  const renderTag = (n: number) => {
    const done = stepsCompleted[n] || activeStep > n;
    const active = activeStep === n;
    if (done) {
      return (
        <span className={`${styles.stepStatusTag} ${styles.tagComplete}`}>
          <Check size={12} /> COMPLETE
        </span>
      );
    }
    if (active) {
      return <span className={`${styles.stepStatusTag} ${styles.tagActive}`}>● ACTIVE</span>;
    }
    return <span className={`${styles.stepStatusTag} ${styles.tagWaiting}`}>○ WAITING</span>;
  };

  /* ── Whether card body is open ─────────────────────────── */
  const isExpanded = (n: number) => activeStep === n || (stepsCompleted[n] && activeStep >= n);

  /* ── Card helpers ──────────────────────────────────────── */
  const cardClass = (n: number) => {
    const done = stepsCompleted[n] || activeStep > n;
    const active = activeStep === n;
    return `${styles.wizardCard} ${active ? styles.wizardCardActive : ''} ${done ? styles.wizardCardCompleted : ''}`;
  };

  /* ───────────────────────────────────────────────────────────
     RENDER
     ─────────────────────────────────────────────────────────── */
  return (
    <div className={styles.container}>
      {/* ── DYNAMIC BACK NAVIGATION ────────────────────────── */}
      <div style={{ marginBottom: '1rem' }}>
        {useProjectStore.getState().projects.length > 0 ? (
          <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>← Back to Dashboard</Link>
        ) : (
          <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>← Back to Home</Link>
        )}
      </div>

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>CONNECT YOUR APPLICATION</h1>
          <p className={styles.subtitle}>
            Add Scrum Master to your existing application in a few simple steps.
            Your application will be registered automatically when the agent connects.
          </p>
        </div>
        <div className={styles.statusHeaderBadge}>● READY TO CONNECT</div>
      </header>

      <div className={styles.wizardContainer}>
        {/* ════════════════════════════════════════════════════
            STEP 01 — DOWNLOAD SCRUM MASTER
           ════════════════════════════════════════════════════ */}
        <div className={cardClass(1)}>
          <div className={styles.wizardHeader} onClick={() => setActiveStep(1)}>
            <div className={styles.wizardHeaderLeft}>
              {renderIndicator(1)}
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#F3F5F7' }}>
                01&nbsp;&nbsp;DOWNLOAD SCRUM MASTER
              </span>
            </div>
            {renderTag(1)}
          </div>

          {isExpanded(1) && (
            <div className={styles.cardBody}>
              <p className={styles.stepDesc}>Download the lightweight Scrum Master integration package.</p>

              <pre className={styles.packagePreviewBox}>{PACKAGE_TREE}</pre>

              {downloadError && (
                <div className={styles.errorBanner}>
                  <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className={styles.errorTitle}>PACKAGE DOWNLOAD FAILED</div>
                    <div className={styles.errorText}>{downloadError}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleDownload} style={{ flexShrink: 0 }}>
                    <RefreshCw size={12} style={{ marginRight: '4px' }} /> RETRY
                  </Button>
                </div>
              )}

              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  size="lg"
                  style={{
                    background: '#F5B942',
                    color: '#080A0F',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <Download size={16} style={{ marginRight: '0.5rem' }} />
                  {isDownloading ? 'GENERATING PACKAGE...' : 'DOWNLOAD SCRUM-MASTER.ZIP'}
                </Button>

                {stepsCompleted[1] && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Check size={14} /> ✓ SCRUM-MASTER.ZIP DOWNLOADED
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            STEP 02 — ADD SCRUM MASTER TO YOUR APPLICATION
           ════════════════════════════════════════════════════ */}
        <div className={cardClass(2)}>
          <div className={styles.wizardHeader} onClick={() => { if (stepsCompleted[1] || activeStep >= 2) setActiveStep(2); }}>
            <div className={styles.wizardHeaderLeft}>
              {renderIndicator(2)}
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#F3F5F7' }}>
                02&nbsp;&nbsp;ADD SCRUM MASTER TO YOUR APPLICATION
              </span>
            </div>
            {renderTag(2)}
          </div>

          {isExpanded(2) && (
            <div className={styles.cardBody}>
              <p className={styles.stepDesc}>
                Extract the downloaded package and place the Scrum Master folder inside the root of your existing application.
              </p>

              <div className={styles.instructionList}>
                <div>1. Download <code>scrum-master.zip</code></div>
                <div>2. Extract the ZIP file</div>
                <div>3. Move the entire <code>scrum-master/</code> folder into the root of your existing application</div>
              </div>

              <pre className={styles.directoryTreeBox}>{DIR_TREE}</pre>

              <div className={styles.warningBox}>
                <strong style={{ color: '#F5B942' }}>IMPORTANT</strong><br />
                Do not replace, delete, or restructure your existing application.
                Scrum Master is added as an integration layer.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  onClick={handleCopyTree}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                >
                  {copiedTree ? <Check size={14} /> : <Copy size={14} />}
                  <span style={{ marginLeft: '0.4rem' }}>{copiedTree ? 'COPIED ✓' : 'COPY DIRECTORY TREE'}</span>
                </Button>

                <Button
                  onClick={() => completeStep(2)}
                  style={{
                    background: stepsCompleted[2] ? '#171D27' : '#F5B942',
                    color: stepsCompleted[2] ? '#10B981' : '#080A0F',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {stepsCompleted[2] ? '✓ FOLDER ADDED' : 'FOLDER ADDED — CONTINUE →'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            STEP 03 — LET ANTIGRAVITY INTEGRATE SCRUM MASTER
           ════════════════════════════════════════════════════ */}
        <div className={cardClass(3)}>
          <div className={styles.wizardHeader} onClick={() => { if (stepsCompleted[2] || activeStep >= 3) setActiveStep(3); }}>
            <div className={styles.wizardHeaderLeft}>
              {renderIndicator(3)}
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#F3F5F7' }}>
                03&nbsp;&nbsp;LET ANTIGRAVITY INTEGRATE SCRUM MASTER
              </span>
            </div>
            {renderTag(3)}
          </div>

          {isExpanded(3) && (
            <div className={styles.cardBody}>
              <p className={styles.stepDesc}>
                Open your existing application in Antigravity and use the prompt below.
                Antigravity will inspect the Scrum Master integration files and integrate them without disrupting your existing application.
              </p>

              <div className={styles.promptBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: '#F5B942', fontWeight: 700, letterSpacing: '0.04em' }}>
                    ANTIGRAVITY PROMPT
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleCopyPrompt} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                    <span style={{ marginLeft: '0.4rem' }}>{copiedPrompt ? '✓ COPIED' : 'COPY PROMPT'}</span>
                  </Button>
                </div>
                <pre className={styles.promptText}>{ANTIGRAVITY_PROMPT}</pre>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <Button
                  onClick={() => completeStep(3)}
                  style={{ background: '#F5B942', color: '#080A0F', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                >
                  I'VE STARTED INTEGRATION →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            STEP 04 — ESTABLISH SIGNAL HANDSHAKE
           ════════════════════════════════════════════════════ */}
        <div className={cardClass(4)}>
          <div className={styles.wizardHeader} onClick={() => { if (stepsCompleted[3] || activeStep >= 4) setActiveStep(4); }}>
            <div className={styles.wizardHeaderLeft}>
              {renderIndicator(4)}
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#F3F5F7' }}>
                04&nbsp;&nbsp;ESTABLISH SIGNAL HANDSHAKE
              </span>
            </div>
            {renderTag(4)}
          </div>

          {(isExpanded(4) || activeStep === 5) && (
            <div className={styles.cardBody}>
              <div className={styles.handshakePanel}>
                {activeStep === 5 ? (
                  /* ── Connected ─────────────────────────────── */
                  <div className={styles.detectedCard}>
                    <CheckCircle2 size={44} style={{ color: '#10B981' }} />
                    <div className={styles.detectedTitle}>● SIGNAL ESTABLISHED</div>

                    <div style={{ fontSize: '0.95rem', color: '#F3F5F7', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      APPLICATION DETECTED
                    </div>

                    <div className={styles.detectedMetaGrid}>
                      <div className={styles.detectedMetaItem}>
                        <span className={styles.metaLabel}>Application</span>
                        <span className={styles.metaValue}>{detectedApp?.name || currentProject?.name || 'Your Application'}</span>
                      </div>
                      <div className={styles.detectedMetaItem}>
                        <span className={styles.metaLabel}>Framework</span>
                        <span className={styles.metaValue}>{detectedApp?.framework || 'Auto-Detected'}</span>
                      </div>
                      <div className={styles.detectedMetaItem}>
                        <span className={styles.metaLabel}>Backend</span>
                        <span className={styles.metaValue}>{detectedApp?.backend || 'Auto-Detected'}</span>
                      </div>
                      <div className={styles.detectedMetaItem}>
                        <span className={styles.metaLabel}>Environment</span>
                        <span className={styles.metaValue}>{detectedApp?.environment || 'development'}</span>
                      </div>
                    </div>

                    <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      ✓ SCRUM MASTER CONNECTED
                    </span>

                    <Button
                      size="lg"
                      onClick={() => navigate('/dashboard')}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0 2.5rem',
                        height: '2.85rem',
                        fontSize: '0.875rem',
                        background: '#F5B942',
                        color: '#080A0F',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      OPEN DASHBOARD
                    </Button>
                  </div>
                ) : (
                  /* ── Waiting / Receiving ──────────────────────────────── */
                  <>
                    <StatusIndicator 
                      status={handshakePhase === 'WAITING' ? 'WAITING' : 'CONNECTED'} 
                      label={
                        handshakePhase === 'WAITING' ? 'LISTENING FOR APPLICATION' :
                        handshakePhase === 'RECEIVED' ? 'SIGNAL RECEIVED' :
                        handshakePhase === 'REGISTERING' ? 'REGISTERING PROJECT...' :
                        'PROJECT CREATED'
                      } 
                      size="lg" 
                    />
                    <SignalLine 
                      color={handshakePhase === 'WAITING' ? '#F5B942' : '#10B981'} 
                      height={28} 
                      animated={handshakePhase !== 'CREATED'} 
                      style={{ maxWidth: '400px', width: '100%' }} 
                    />

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#8D96A5', marginTop: '0.5rem' }}>
                      ENROLLMENT STATUS: {handshakePhase}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
