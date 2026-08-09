import React, { useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useMonitoringStore } from '../../stores/monitoringStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Activity, AlertCircle, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { uptime, history, incidents, fetchDashboardData, clearData } = useMonitoringStore();

  useEffect(() => {
    if (currentProject) {
      fetchDashboardData(currentProject.id);
    } else {
      clearData();
    }
  }, [currentProject?.id, fetchDashboardData, clearData]);

  if (!currentProject) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>
          <Activity size={48} />
        </div>
        <h2>No project selected</h2>
        <p>Create or select a project to view monitoring data.</p>
      </div>
    );
  }

  const activeIncidents = incidents.filter(i => i.status === 'open');
  const frontendCheck = history.find(h => h.target === 'frontend');
  const backendCheck = history.find(h => h.target === 'backend');

  const stats = [
    { 
      label: 'Uptime (24h)', 
      value: !currentProject.monitoringEnabled ? 'Disabled' : 
             (uptime?.totalChecks === 0 ? 'Collecting data...' : 
             (uptime ? `${uptime.uptimePercent}%` : '--')), 
      icon: Clock, 
      color: !currentProject.monitoringEnabled ? 'default' : 
             (uptime && uptime.uptimePercent > 99 ? 'success' : 'warning')
    },
    { 
      label: 'Avg Response', 
      value: !currentProject.monitoringEnabled ? '--' :
             (uptime?.totalChecks === 0 ? '--' : 
             (uptime?.avgResponseTime ? `${uptime.avgResponseTime}ms` : '--')), 
      icon: Zap, 
      color: 'info' 
    },
    { 
      label: 'Active Incidents', 
      value: !currentProject.monitoringEnabled ? '--' : activeIncidents.length.toString(), 
      icon: AlertCircle, 
      color: activeIncidents.length > 0 ? 'error' : 'success' 
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{currentProject.name} Dashboard</h1>
          <p className={styles.subtitle}>Overview and performance metrics</p>
        </div>
        <Badge 
          variant={currentProject.integrationStatus === 'CONNECTED' ? 'success' : 'default'}
        >
          {currentProject.integrationStatus.replace('_', ' ')}
        </Badge>
      </header>

      {currentProject.integrationStatus !== 'CONNECTED' && (
        <Card className={styles.warningCard}>
          <CardContent className={styles.warningContent}>
            <AlertCircle className={styles.warningIcon} />
            <div>
              <h3>Integration Required</h3>
              <p>This project is not fully connected. Go to "Setup Scrum Master" to complete integration and begin receiving real data.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!currentProject.monitoringEnabled && (
        <Card className={styles.warningCard}>
          <CardContent className={styles.warningContent}>
            <AlertCircle className={styles.warningIcon} />
            <div>
              <h3>Monitoring Disabled</h3>
              <p>Active monitoring is currently disabled for this project. Go to Settings to enable it.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className={styles.statCard}>
              <div className={styles.statIconWrapper}>
                <stat.icon size={24} className={styles[`icon-${stat.color}`]} />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>{stat.label}</p>
                <p className={styles.statValue}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <Card className={styles.statusCard}>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.targetStatusList}>
                {currentProject.frontendUrl ? (
                  <div className={styles.targetStatus}>
                    <div className={styles.targetInfo}>
                      <span className={styles.targetName}>Frontend</span>
                      <span className={styles.targetUrl}>{currentProject.frontendUrl}</span>
                    </div>
                    {frontendCheck ? (
                      <div className={styles.targetMetrics}>
                        <span className={styles.metricLatency}>{frontendCheck.responseTime}ms</span>
                        <Badge variant={frontendCheck.status === 'up' ? 'success' : 'error'}>
                          {frontendCheck.status.toUpperCase()}
                        </Badge>
                      </div>
                    ) : (
                      <span className={styles.textMuted}>Waiting for data...</span>
                    )}
                  </div>
                ) : (
                  <div className={styles.targetStatus}>
                    <span className={styles.textMuted}>Frontend monitoring not configured</span>
                  </div>
                )}

                {currentProject.backendUrl ? (
                  <div className={styles.targetStatus}>
                    <div className={styles.targetInfo}>
                      <span className={styles.targetName}>Backend API</span>
                      <span className={styles.targetUrl}>{currentProject.backendUrl}</span>
                    </div>
                    {backendCheck ? (
                      <div className={styles.targetMetrics}>
                        <span className={styles.metricLatency}>{backendCheck.responseTime}ms</span>
                        <Badge variant={backendCheck.status === 'up' ? 'success' : 'error'}>
                          {backendCheck.status.toUpperCase()}
                        </Badge>
                      </div>
                    ) : (
                      <span className={styles.textMuted}>Waiting for data...</span>
                    )}
                  </div>
                ) : (
                  <div className={styles.targetStatus}>
                    <span className={styles.textMuted}>Backend monitoring not configured</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {activeIncidents.length > 0 && (
            <Card className={styles.incidentCard}>
              <CardHeader>
                <CardTitle className={styles.incidentTitle}>
                  <AlertCircle size={20} /> Active Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.incidentList}>
                  {activeIncidents.map(incident => (
                    <div key={incident.id} className={styles.incidentItem}>
                      <div className={styles.incidentHeader}>
                        <h4>{incident.target.toUpperCase()} DOWN</h4>
                        <span>Started: {new Date(incident.startedAt).toLocaleTimeString()}</span>
                      </div>
                      <p className={styles.incidentError}>{incident.lastError}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className={styles.activityCard}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.activityList}>
              {history.length > 0 ? history.map((check) => (
                <div key={check.id} className={styles.activityItem}>
                  {check.status === 'up' ? (
                    <CheckCircle2 size={16} className={styles['icon-success']} />
                  ) : (
                    <XCircle size={16} className={styles['icon-error']} />
                  )}
                  <div className={styles.activityDetails}>
                    <p>{check.target.toUpperCase()} check {check.status}</p>
                    <span>{new Date(check.checkedAt).toLocaleTimeString()} • {check.responseTime}ms</span>
                  </div>
                </div>
              )) : (
                <p className={styles.textMuted}>No checks recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
