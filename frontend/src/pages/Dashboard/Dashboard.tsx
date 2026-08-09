import { useProjectStore } from '../../stores/projectStore';
import { useMonitoringStore } from '../../stores/monitoringStore';
import { useErrorStore } from '../../stores/errorStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { projectService, type IntegrationStatusResponse } from '../../services/projects';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Activity, AlertCircle, Clock, Zap, CheckCircle2, XCircle, Terminal } from 'lucide-react';
import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const { currentProject, projects, isLoading: isProjectsLoading } = useProjectStore();
  const { history, incidents, uptime, fetchDashboardData } = useMonitoringStore();
  const { groups: errorGroups, fetchGroups: fetchErrorGroups, isLoading: errorsLoading } = useErrorStore();
  const { unreadCount, fetchUnreadCount } = useFeedbackStore();
  const [integration, setIntegration] = React.useState<IntegrationStatusResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentProject) {
      fetchDashboardData(currentProject.id);
      fetchErrorGroups(currentProject.id);
      fetchUnreadCount(currentProject.id);
      projectService.getIntegrationStatus(currentProject.id)
        .then(setIntegration)
        .catch(() => setIntegration(null));
    }
  }, [currentProject, fetchDashboardData, fetchErrorGroups, fetchUnreadCount]);

  if (!currentProject) {
    if (isProjectsLoading) {
      return null;
    }
    
    if (projects.length === 0) {
      // Redirect first-time users directly to the setup wizard
      return <Navigate to="/setup" replace />;
    }
    
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>
          <Activity size={48} />
        </div>
        <h2>Let's connect your first project</h2>
        <p>Connect an existing project to start monitoring uptime, performance, errors, feedback and analytics.</p>
        <div style={{ marginTop: '1.5rem' }}>
          <Button onClick={() => navigate('/setup')}>Setup Scrum Master</Button>
        </div>
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
                <div className={styles.targetStatus}>
                  <div className={styles.targetInfo}>
                    <Terminal size={16} />
                    <span className={styles.targetName}>Agent Integration</span>
                  </div>
                  {currentProject.integrationStatus === 'CONNECTED' ? (
                    <div className={styles.targetMetrics}>
                      <span className={styles.metricLatency}>{integration?.lastHeartbeatAt ? new Date(integration.lastHeartbeatAt).toLocaleTimeString() : 'Connected'}</span>
                      <Badge variant="success">CONNECTED</Badge>
                    </div>
                  ) : currentProject.integrationStatus === 'WAITING' ? (
                    <div className={styles.targetMetrics}>
                      <span className={styles.textMuted}>Awaiting heartbeat...</span>
                      <Badge variant="warning">WAITING</Badge>
                    </div>
                  ) : currentProject.integrationStatus === 'DISCONNECTED' ? (
                    <div className={styles.targetMetrics}>
                      <span className={styles.textMuted}>Connection lost</span>
                      <Badge variant="error">DISCONNECTED</Badge>
                    </div>
                  ) : (
                    <div className={styles.targetMetrics}>
                      <Button variant="outline" size="sm" onClick={() => navigate('/setup')}>Setup Integration</Button>
                      <Badge variant="error">{currentProject.integrationStatus}</Badge>
                    </div>
                  )}
                </div>

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
          
          <Card className={styles.statusCard}>
            <CardHeader style={{ paddingBottom: '0.5rem' }}>
              <CardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Application Errors
                <Button variant="outline" size="sm" onClick={() => navigate('/errors')}>View Error Center</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <div className={styles.textMuted}>Loading errors...</div>
              ) : (
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {errorGroups.reduce((acc, g) => acc + g.occurrenceCount, 0).toLocaleString()}
                    </span>
                    <span className={styles.textMuted}>total occurrences (24h)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <Badge variant="warning">
                        {errorGroups.filter(g => g.status === 'ONGOING').length} Ongoing
                      </Badge>
                      <Badge variant="error">
                        {errorGroups.filter(g => g.severity === 'CRITICAL').length} Critical
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={styles.statusCard}>
            <CardHeader style={{ paddingBottom: '0.5rem' }}>
              <CardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Feedback
                <Button variant="outline" size="sm" onClick={() => navigate('/feedback')}>View Feedback Hub</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {unreadCount}
                  </span>
                  <span className={styles.textMuted}>unread {unreadCount === 1 ? 'message' : 'messages'}</span>
                </div>
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
