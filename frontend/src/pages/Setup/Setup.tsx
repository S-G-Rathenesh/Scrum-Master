import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { projectService, type IntegrationStatusResponse } from '../../services/projects';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Download, Copy, Check, RefreshCw, XCircle, Key, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Setup.module.css';

export const Setup: React.FC = () => {
  const { currentProject, updateCurrentProjectIntegrationStatus, fetchProjects, selectProjectById } = useProjectStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = searchParams.get('new') === 'true';
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  
  const [integration, setIntegration] = useState<IntegrationStatusResponse | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 State
  const [newProject, setNewProject] = useState({ name: '', frontendUrl: '', backendUrl: '' });
  const [isCreating, setIsCreating] = useState(false);

  const instructionText = "Read SCRUM_MASTER_INSTRUCTIONS.md and integrate Scrum Master into this project.";

  useEffect(() => {
    let pollInterval: number;
    
    const fetchStatus = async () => {
      if (!currentProject || isNew) return;
      try {
        const data = await projectService.getIntegrationStatus(currentProject.id);
        setIntegration(data);
        if (currentProject.integrationStatus !== data.status) {
          updateCurrentProjectIntegrationStatus(data.status);
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to fetch integration status");
        }
      }
    };

    if (currentProject && !isNew) {
      fetchStatus();
      // Poll every 5 seconds if waiting
      pollInterval = window.setInterval(() => {
        fetchStatus();
      }, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      setRawToken(null);
      setError(null);
    };
  }, [currentProject, isNew, updateCurrentProjectIntegrationStatus]);

  const handleCopy = () => {
    navigator.clipboard.writeText(instructionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyToken = () => {
    if (rawToken) {
      navigator.clipboard.writeText(rawToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) return;
    
    setIsCreating(true);
    setError(null);
    try {
      const created = await projectService.createProject(newProject);
      await fetchProjects();
      selectProjectById(created.id);
      setSearchParams({}); // Remove ?new=true
      setNewProject({ name: '', frontendUrl: '', backendUrl: '' });
    } catch (err: any) {
      setError("Failed to register project.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerate = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectService.generateIntegrationToken(currentProject.id);
      setRawToken(data.token);
      updateCurrentProjectIntegrationStatus('WAITING');
      const statusData = await projectService.getIntegrationStatus(currentProject.id);
      setIntegration(statusData);
    } catch (err: any) {
      setError("Failed to generate token.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegenerate = async () => {
    if (!currentProject || !window.confirm("Are you sure? This will disconnect any existing agents using the old token.")) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectService.regenerateIntegrationToken(currentProject.id);
      setRawToken(data.token);
      updateCurrentProjectIntegrationStatus('WAITING');
      const statusData = await projectService.getIntegrationStatus(currentProject.id);
      setIntegration(statusData);
    } catch (err: any) {
      setError("Failed to regenerate token.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRevoke = async () => {
    if (!currentProject || !window.confirm("Are you sure? This will permanently disable integration for this project until a new token is generated.")) return;
    setIsLoading(true);
    setError(null);
    try {
      await projectService.revokeIntegration(currentProject.id);
      setRawToken(null);
      updateCurrentProjectIntegrationStatus('REVOKED');
      const statusData = await projectService.getIntegrationStatus(currentProject.id);
      setIntegration(statusData);
    } catch (err: any) {
      setError("Failed to revoke integration.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1: Register Project (if no project is selected OR user explicitly clicked New Project)
  if (!currentProject || isNew) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Register Your Project</h1>
            <p className={styles.subtitle}>Connect an existing hosted project to Scrum Master.</p>
          </div>
        </header>
        
        {error && <div className={styles.errorAlert}>{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.stepDesc}>
              You are connecting an existing hosted project to Scrum Master. You do not need to rebuild or modify your application's architecture.
            </p>
            <form onSubmit={handleCreateProject} className={styles.createForm}>
              <Input
                label="Project Name"
                placeholder="e.g. My E-Commerce"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                required
              />
              <Input
                label="Frontend URL (Optional)"
                placeholder="https://shop.example.com"
                value={newProject.frontendUrl}
                onChange={(e) => setNewProject({ ...newProject, frontendUrl: e.target.value })}
              />
              <Input
                label="Backend/API URL (Optional)"
                placeholder="https://api.shop.example.com"
                value={newProject.backendUrl}
                onChange={(e) => setNewProject({ ...newProject, backendUrl: e.target.value })}
              />
              <div className={styles.formActions} style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                {isNew && currentProject && (
                  <Button variant="outline" type="button" onClick={() => setSearchParams({})}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isCreating || !newProject.name}>
                  {isCreating ? 'Registering...' : 'Register Project'}
                  <ArrowRight size={16} className={styles.btnIconRight} style={{ marginLeft: '0.5rem' }} />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 2-5: Integration flow for the current project
  const downloadUrl = `http://localhost:8000/api/v1/projects/${currentProject.id}/integration/download`;

  // SUCCESS STATE (If already connected)
  if (currentProject.integrationStatus === 'CONNECTED') {
    return (
      <div className={styles.container}>
        <div className={styles.successStateWrapper} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--success-color)', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Project Connected</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Scrum Master is now receiving data from <strong>{currentProject.name}</strong>.
          </p>
          <Button size="lg" onClick={() => navigate('/')}>Open Dashboard</Button>
        </div>

        <div style={{ marginTop: '4rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Advanced Connection Settings</h3>
          <Card>
            <CardContent style={{ paddingTop: '1.5rem' }}>
              <div className={styles.tokenManagement}>
                <div className={styles.tokenActions}>
                  <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
                    <RefreshCw size={16} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
                    Regenerate Token
                  </Button>
                  <Button variant="danger" onClick={handleRevoke} disabled={isLoading}>
                    <XCircle size={16} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
                    Revoke Integration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // WAITING/DISCONNECTED STATE (Onboarding Wizard)
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Setup Scrum Master</h1>
          <p className={styles.subtitle}>Integrate {currentProject.name} with Scrum Master monitoring</p>
        </div>
        <div className={styles.statusBox}>
          <span className={styles.statusLabel}>Integration Status:</span>
          <Badge 
            variant={
              currentProject.integrationStatus === 'DISCONNECTED' || currentProject.integrationStatus === 'REVOKED' ? 'error' : 'warning'
            }
          >
            {currentProject.integrationStatus.replace('_', ' ')}
          </Badge>
        </div>
      </header>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <div className={styles.steps}>
        {/* Step 1: Token Management */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.stepTitle}>
              <span className={styles.stepNumber}>1</span>
              Integration Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.stepDesc}>
              Generate a secure integration token for your project. This token allows your agent to report heartbeats.
            </p>
            
            {!integration || integration.status === 'REVOKED' ? (
              <Button onClick={handleGenerate} disabled={isLoading}>
                <Key size={16} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
                Generate Integration Token
              </Button>
            ) : (
              <div className={styles.tokenManagement}>
                <div className={styles.tokenActions}>
                  <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
                    <RefreshCw size={16} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
                    Regenerate Token
                  </Button>
                  <Button variant="danger" onClick={handleRevoke} disabled={isLoading}>
                    <XCircle size={16} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
                    Revoke Integration
                  </Button>
                </div>
              </div>
            )}

            {rawToken && (
              <div className={styles.rawTokenBox}>
                <div className={styles.warningAlert}>
                  Keep this token private. It provides access to this project's Scrum Master integration. 
                  <strong>This token will only be shown once.</strong>
                </div>
                <div className={styles.copyBox}>
                  <code className={styles.codeText}>{rawToken}</code>
                  <Button variant="secondary" onClick={handleCopyToken}>
                    {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                    <span className={styles.btnIcon} style={{ marginLeft: '0.5rem' }}>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Download Package */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.stepTitle}>
              <span className={styles.stepNumber}>2</span>
              Download Integration Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.stepDesc}>
              Download the integration files and add them to your project repository. 
              This includes agent instructions and configuration examples.
            </p>
            
            <div className={styles.bulkDownload}>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <Button>
                  <Download size={16} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
                  Download Integration Package
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Tell Antigravity */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.stepTitle}>
              <span className={styles.stepNumber}>3</span>
              Tell Antigravity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.stepDesc}>
              After placing the unzipped files into your project, copy the instruction below and send it to your AI coding agent (Antigravity).
            </p>
            
            <div className={styles.copyBox}>
              <code className={styles.codeText}>{instructionText}</code>
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className={styles.btnIcon} style={{ marginLeft: '0.5rem' }}>{copied ? 'Copied' : 'Copy Instruction'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Verify */}
        <Card>
          <CardContent style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', marginTop: '2rem' }}>
            <div className={styles.verifyBox} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className={styles.pulseYellow} style={{ width: 24, height: 24 }} />
              <h3 style={{ margin: 0 }}>Waiting for connection</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Waiting for your project to send its first heartbeat...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
