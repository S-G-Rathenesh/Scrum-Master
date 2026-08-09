import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Download, Copy, Check, Terminal } from 'lucide-react';
import styles from './Setup.module.css';

export const Setup: React.FC = () => {
  const { currentProject } = useProjectStore();
  const [copied, setCopied] = useState(false);

  const instructionText = "Read SCRUM_MASTER_INSTRUCTIONS.md and integrate Scrum Master into this project.";

  const handleCopy = () => {
    navigator.clipboard.writeText(instructionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            variant={currentProject.integrationStatus === 'CONNECTED' ? 'success' : 'warning'}
          >
            {currentProject.integrationStatus.replace('_', ' ')}
          </Badge>
        </div>
      </header>

      <div className={styles.steps}>
        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.stepTitle}>
              <span className={styles.stepNumber}>1</span>
              Download Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.stepDesc}>
              Download the integration files and add them to your project repository. 
              (Note: The actual agent functionality is coming in Phase 4).
            </p>
            
            <div className={styles.fileList}>
              <div className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <Terminal size={18} className={styles.fileIcon} />
                  <div>
                    <span className={styles.fileName}>scrum-master-agent.js</span>
                    <span className={styles.fileDesc}>Lightweight integration agent for connecting your project</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => alert('Download coming in Phase 4')}>
                  <Download size={14} className={styles.btnIcon} />
                  Download Agent
                </Button>
              </div>

              <div className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <Terminal size={18} className={styles.fileIcon} />
                  <div>
                    <span className={styles.fileName}>SCRUM_MASTER_INSTRUCTIONS.md</span>
                    <span className={styles.fileDesc}>Instructions for your AI coding agent</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => alert('Download coming in Phase 4')}>
                  <Download size={14} className={styles.btnIcon} />
                  Download Instructions
                </Button>
              </div>
            </div>

            <div className={styles.bulkDownload}>
              <Button onClick={() => alert('Download package coming in Phase 4')}>
                <Download size={16} className={styles.btnIcon} />
                Download Integration Package
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.stepTitle}>
              <span className={styles.stepNumber}>2</span>
              Add to Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.stepDesc}>
              Place the downloaded files into the root directory of your project repository.
            </p>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.stepTitle}>
              <span className={styles.stepNumber}>3</span>
              Tell Antigravity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.stepDesc}>
              Copy the instruction below and send it to your AI coding agent (Antigravity).
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

        {/* Step 4 */}
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
                  <span>Connected successfully</span>
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
