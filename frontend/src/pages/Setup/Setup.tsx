import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { projectService, type IntegrationStatusResponse } from '../../services/projects';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Download, Copy, Check, RefreshCw, XCircle, Key } from 'lucide-react';
import styles from './Setup.module.css';

export const Setup: React.FC = () => {
  const { currentProject, updateCurrentProjectIntegrationStatus } = useProjectStore();
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  
  const [integration, setIntegration] = useState<IntegrationStatusResponse | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const instructionText = "Read SCRUM_MASTER_INSTRUCTIONS.md and integrate Scrum Master into this project.";

  useEffect(() => {
    let pollInterval: number;
    
    const fetchStatus = async () => {
      if (!currentProject) return;
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

    if (currentProject) {
      fetchStatus();
      // Poll every 15 seconds if waiting
      pollInterval = window.setInterval(() => {
        fetchStatus();
      }, 15000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      setRawToken(null); // Clear raw token when switching projects
      setError(null);
    };
  }, [currentProject, updateCurrentProjectIntegrationStatus]);

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

  if (!currentProject) {
    return (
      <div className={styles.container}>
        <h1>Setup Scrum Master in Your Project</h1>
        <Card>
          <CardContent className={styles.emptyContent}>
            <p>Please select or create a project first to view setup instructions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const downloadUrl = `http://localhost:8000/api/v1/projects/${currentProject.id}/integration/download`;

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
              currentProject.integrationStatus === 'CONNECTED' ? 'success' : 
              currentProject.integrationStatus === 'DISCONNECTED' || currentProject.integrationStatus === 'REVOKED' ? 'error' : 
              'warning'
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
                <Key size={16} className={styles.btnIcon} />
                Generate Integration Token
              </Button>
            ) : (
              <div className={styles.tokenManagement}>
                <div className={styles.tokenActions}>
                  <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
                    <RefreshCw size={16} className={styles.btnIcon} />
                    Regenerate Token
                  </Button>
                  <Button variant="danger" onClick={handleRevoke} disabled={isLoading}>
                    <XCircle size={16} className={styles.btnIcon} />
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
                    <span className={styles.btnIcon}>{copiedToken ? 'Copied' : 'Copy'}</span>
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
                  <Download size={16} className={styles.btnIcon} />
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
                <span className={styles.btnIcon}>{copied ? 'Copied' : 'Copy Instruction'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Verify */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.stepTitle}>
              <span className={styles.stepNumber}>4</span>
              Verify Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.verifyBox}>
              {currentProject.integrationStatus === 'CONNECTED' ? (
                <>
                  <div className={styles.pulseGreen} />
                  <span>Connected successfully! Last heartbeat: {integration?.lastHeartbeatAt ? new Date(integration.lastHeartbeatAt).toLocaleTimeString() : 'Unknown'}</span>
                </>
              ) : currentProject.integrationStatus === 'DISCONNECTED' ? (
                <>
                  <div className={styles.pulseRed} />
                  <span>Integration disconnected.</span>
                </>
              ) : currentProject.integrationStatus === 'REVOKED' ? (
                <>
                  <div className={styles.pulseRed} />
                  <span>Integration revoked.</span>
                </>
              ) : (
                <>
                  <div className={styles.pulseYellow} />
                  <span>Waiting for project connection...</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
