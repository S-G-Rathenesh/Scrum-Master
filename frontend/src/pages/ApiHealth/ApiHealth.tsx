import React, { useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useMonitoringStore } from '../../stores/monitoringStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProjectRequiredEmptyState } from '../../components/common/ProjectRequiredEmptyState';
import { CheckCircle2, XCircle } from 'lucide-react';
import styles from './ApiHealth.module.css';

export const ApiHealth: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { history, fetchHistory, isLoading } = useMonitoringStore();

  useEffect(() => {
    if (currentProject) {
      fetchHistory(currentProject.id);
    }
  }, [currentProject?.id, fetchHistory]);

  if (!currentProject) {
    return (
      <ProjectRequiredEmptyState 
        type="api-health" 
        message="Select a project to check API health, uptime, and availability." 
      />
    );
  }

  const backendChecks = history.filter(h => h.target === 'backend');
  const latestCheck = backendChecks[0];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>API Health</h1>
        <p className={styles.subtitle}>Detailed monitoring for {currentProject.name} backend</p>
      </header>

      {!currentProject.backendUrl ? (
        <Card>
          <CardContent className={styles.emptyState}>
            <p>Backend API monitoring is not configured.</p>
            <p className={styles.textMuted}>Go to Settings to configure your Backend API URL.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className={styles.summaryCard}>
            <CardHeader>
              <CardTitle>Backend Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && !latestCheck ? (
                <p>Loading...</p>
              ) : latestCheck ? (
                <div className={styles.statusBox}>
                  <div className={styles.statusMain}>
                    {latestCheck.status === 'up' ? (
                      <CheckCircle2 size={32} className={styles['icon-success']} />
                    ) : (
                      <XCircle size={32} className={styles['icon-error']} />
                    )}
                    <div>
                      <h2>{latestCheck.status === 'up' ? 'Healthy' : 'Unhealthy'}</h2>
                      <p className={styles.textMuted}>Target: {currentProject.backendUrl}</p>
                    </div>
                  </div>
                  
                  <div className={styles.metricsGrid}>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>HTTP Status</span>
                      <span className={styles.metricValue}>{latestCheck.statusCode || 'N/A'}</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Response Time</span>
                      <span className={styles.metricValue}>{latestCheck.responseTime ? `${latestCheck.responseTime}ms` : 'Timeout'}</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>Last Checked</span>
                      <span className={styles.metricValue}>{new Date(latestCheck.checkedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p>No backend checks recorded yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>HTTP Code</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {backendChecks.length > 0 ? backendChecks.map((check) => (
                    <tr key={check.id}>
                      <td>{new Date(check.checkedAt).toLocaleString()}</td>
                      <td>
                        <Badge variant={check.status === 'up' ? 'success' : 'error'}>
                          {check.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className={styles.mono}>{check.responseTime ? `${check.responseTime}ms` : '--'}</td>
                      <td className={styles.mono}>{check.statusCode || '--'}</td>
                      <td className={styles.errorCell}>{check.errorMessage || '--'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className={styles.textCenter}>No checks found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
