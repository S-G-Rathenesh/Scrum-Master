import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Download, Copy, Check, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Setup.module.css';

export const Setup: React.FC = () => {
  const { currentProject, projects, fetchProjects, selectProjectById } = useProjectStore();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Track the initial number of projects to detect when a new one is auto-provisioned
  const [initialProjectCount] = useState(projects.length);

  const instructionText = "Read SCRUM_MASTER_INSTRUCTIONS.md and integrate Scrum Master into this project.";

  useEffect(() => {
    let pollInterval: number;
    
    if (currentStep === 4) {
      // Determine if a new project was added
      if (projects.length > initialProjectCount) {
        // Find the new project and select it
        // The newly provisioned project will usually be at index 0 (assuming sort desc by createdAt)
        const newProject = projects[0];
        if (newProject && newProject.id !== currentProject?.id) {
          selectProjectById(newProject.id);
          setCurrentStep(5);
        }
      } else {
        // Poll every 5 seconds for new projects from the heartbeat
        pollInterval = window.setInterval(() => {
          fetchProjects();
        }, 5000);
      }
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [projects, initialProjectCount, fetchProjects, selectProjectById, currentProject, currentStep]);

  const handleCopy = () => {
    navigator.clipboard.writeText(instructionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const token = localStorage.getItem('token') || '';
      
      const response = await fetch('http://localhost:8000/api/v1/integration/enrollment-package', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to download package");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "scrum-master-integration-package.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      // Auto-advance after download
      setCurrentStep(2);
    } catch (error) {
      console.error(error);
      alert("Failed to download integration package.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper to render step number indicator
  const renderStepIndicator = (stepNumber: number) => {
    const isCompleted = currentStep > stepNumber;
    const isActive = currentStep === stepNumber;
    
    return (
      <div className={`${styles.stepIndicator} ${isCompleted ? styles.stepCompleted : ''} ${isActive ? styles.stepActive : ''}`}>
        {isCompleted ? <Check size={16} /> : stepNumber}
      </div>
    );
  };

  // SUCCESS STATE (If a project is recently connected or already selected and connected)
  if (currentProject && currentProject.integrationStatus === 'CONNECTED' || currentStep === 5) {
    return (
      <div className={styles.container}>
        <div className={styles.successStateWrapper} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--success-color)', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Project Connected</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Scrum Master is now receiving data from <strong>{currentProject?.name}</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '3rem', textAlign: 'left' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Connection Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
                <strong>Connected</strong>
              </div>
            </div>
          </div>
          <Button size="lg" onClick={() => navigate('/')}>Open Dashboard</Button>
        </div>
      </div>
    );
  }

  // ONBOARDING WIZARD
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Setup Scrum Master</h1>
          <p className={styles.subtitle}>Connect your existing project to Scrum Master. No rebuild required.</p>
        </div>
      </header>

      <div className={styles.wizardContainer}>
        {/* Step 1: Download Package */}
        <Card className={`${styles.wizardCard} ${currentStep !== 1 ? styles.wizardCardInactive : ''}`}>
          <CardHeader className={styles.wizardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {renderStepIndicator(1)}
              <CardTitle style={{ margin: 0 }}>Connect Your Existing Project</CardTitle>
            </div>
          </CardHeader>
          
          {currentStep === 1 && (
            <CardContent>
              <p className={styles.stepDesc}>
                Scrum Master connects to your existing application. You do not need to rebuild your application.
              </p>
              
              <div style={{ marginTop: '1.5rem' }}>
                <Button onClick={handleDownload} disabled={isDownloading} size="lg">
                  <Download size={18} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
                  {isDownloading ? 'Generating Package...' : 'Download Integration Package'}
                </Button>
              </div>
            </CardContent>
          )}
          
          {currentStep > 1 && (
            <CardContent style={{ paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}>
                <Check size={16} />
                <span>Integration package downloaded</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 2: Extract & Add */}
        <Card className={`${styles.wizardCard} ${currentStep !== 2 ? styles.wizardCardInactive : ''}`}>
          <CardHeader className={styles.wizardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {renderStepIndicator(2)}
              <CardTitle style={{ margin: 0, color: currentStep < 2 ? 'var(--text-muted)' : 'inherit' }}>Add Scrum Master to Your Project</CardTitle>
            </div>
          </CardHeader>
          
          {currentStep === 2 && (
            <CardContent>
              <ol className={styles.instructionList}>
                <li>Extract the downloaded package.</li>
                <li>Copy the integration files into the ROOT of your existing project.</li>
                <li>Open that existing project in Antigravity.</li>
              </ol>
              
              <div style={{ marginTop: '2rem' }}>
                <Button onClick={() => setCurrentStep(3)}>
                  Continue
                  <ChevronRight size={16} className={styles.btnIcon} style={{ marginLeft: '0.5rem' }} />
                </Button>
              </div>
            </CardContent>
          )}
          
          {currentStep > 2 && (
            <CardContent style={{ paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}>
                <Check size={16} />
                <span>Package added to project</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 3: Tell Antigravity */}
        <Card className={`${styles.wizardCard} ${currentStep !== 3 ? styles.wizardCardInactive : ''}`}>
          <CardHeader className={styles.wizardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {renderStepIndicator(3)}
              <CardTitle style={{ margin: 0, color: currentStep < 3 ? 'var(--text-muted)' : 'inherit' }}>Let Antigravity Integrate Scrum Master</CardTitle>
            </div>
          </CardHeader>
          
          {currentStep === 3 && (
            <CardContent>
              <p className={styles.stepDesc}>
                Tell Antigravity:
              </p>
              
              <div className={styles.copyBox} style={{ margin: '1rem 0' }}>
                <code className={styles.codeText}>{instructionText}</code>
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span className={styles.btnIcon} style={{ marginLeft: '0.5rem' }}>{copied ? 'Copied' : 'Copy Instructions'}</span>
                </Button>
              </div>
              
              <div style={{ marginTop: '2rem' }}>
                <Button onClick={() => setCurrentStep(4)}>
                  I've Started the Integration
                  <ChevronRight size={16} className={styles.btnIcon} style={{ marginLeft: '0.5rem' }} />
                </Button>
              </div>
            </CardContent>
          )}
          
          {currentStep > 3 && (
            <CardContent style={{ paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}>
                <Check size={16} />
                <span>Ready for connection</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 4: Verify */}
        <Card className={`${styles.wizardCard} ${currentStep !== 4 ? styles.wizardCardInactive : ''}`}>
          <CardHeader className={styles.wizardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {renderStepIndicator(4)}
              <CardTitle style={{ margin: 0, color: currentStep < 4 ? 'var(--text-muted)' : 'inherit' }}>Connect Your Project</CardTitle>
            </div>
          </CardHeader>
          
          {currentStep === 4 && (
            <CardContent>
              <p className={styles.stepDesc}>
                Once Antigravity completes the integration and your existing application starts, Scrum Master will detect the secure handshake automatically.
              </p>
              
              <div className={styles.verifyBox} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem', padding: '2rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div className={styles.pulseYellow} style={{ width: 32, height: 32 }} />
                <h3 style={{ margin: 0 }}>Waiting for your project...</h3>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};
