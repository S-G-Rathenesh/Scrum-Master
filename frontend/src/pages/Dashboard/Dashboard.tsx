import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useMonitoringStore } from '../../stores/monitoringStore';
import { useErrorStore } from '../../stores/errorStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { projectService, type IntegrationStatusResponse } from '../../services/projects';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SignalLine } from '../../components/common/SignalLine';
import { StatusIndicator } from '../../components/common/StatusIndicator';
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  Zap, 
  CheckCircle2, 
  Terminal, 
  ShieldCheck, 
  ArrowRight,
  Layers,
  MessageSquare,
  Globe,
  Plus
} from 'lucide-react';
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
      return (
        <div className={styles.emptyStateContainer}>
          <div className={styles.emptyStateBox}>
            <span className={styles.systemTag} style={{ margin: '0 auto 1rem' }}>
              ● SIGNAL CONTROL 2.0
            </span>
            <h1 className={styles.emptyStateTitle}>NO APPLICATION SIGNAL DETECTED</h1>
            <p className={styles.emptyStateDesc}>
              Your monitoring workspace is ready. Connect an existing application codebase to begin collecting uptime telemetry, API health, and error signals.
            </p>
            
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.iconSuccess} /> Uptime Telemetry & Response Latency
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.iconSuccess} /> Error Signal Grouping & Diagnostics
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.iconSuccess} /> Synthetic Target Endpoint Monitoring
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.iconSuccess} /> Operational Feedback Console
              </div>
            </div>

            <SignalLine color="var(--color-primary)" height={24} animated={true} style={{ marginBottom: '1.5rem' }} />
            
            <Button size="lg" onClick={() => navigate('/setup')} style={{ padding: '0 2.25rem', height: '2.85rem', fontSize: '0.875rem', background: 'var(--color-primary)', color: '#080A0F', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              <Plus size={16} style={{ marginRight: '6px' }} /> CREATE PROJECT
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className={styles.emptyStateContainer}>
        <div className={styles.emptyStateBox}>
          <Activity size={36} className={styles.iconInfo} style={{ margin: '0 auto 1rem' }} />
          <h2 className={styles.emptyStateTitle}>NO PROJECT SELECTED</h2>
          <p className={styles.emptyStateDesc}>
            Select a project from the top workspace selector or register a new system to inspect its control center.
          </p>
          <Button onClick={() => navigate('/setup')} variant="outline">
            ADD PROJECT
          </Button>
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter(i => i.status === 'open');
  const frontendCheck = history.find(h => h.target === 'frontend');
  const backendCheck = history.find(h => h.target === 'backend');

  // Real state-derived setup track
  const setupSteps = [
    { num: '01', label: 'DOWNLOAD', completed: true },
    { num: '02', label: 'INSTALL', completed: true },
    { num: '03', label: 'INTEGRATE', completed: projects.length > 0 },
    { num: '04', label: 'CONNECT', completed: currentProject.integrationStatus === 'CONNECTED' },
    { num: '05', label: 'MONITOR', completed: Boolean(currentProject.monitoringEnabled) },
  ];
  const completedStepsCount = setupSteps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedStepsCount / setupSteps.length) * 100);

  const stats = [
    { 
      label: 'UPTIME / 24H', 
      sublabel: 'STABILITY',
      value: !currentProject.monitoringEnabled ? 'Disabled' : 
             (uptime?.totalChecks === 0 ? 'Collecting...' : 
             (uptime ? `${uptime.uptimePercent}%` : '--')), 
      icon: Clock, 
      sparkline: 'M 0 10 L 40 10 L 50 4 L 60 16 L 70 10 L 120 10'
    },
    { 
      label: 'P95 LATENCY', 
      sublabel: 'AVG RESPONSE',
      value: !currentProject.monitoringEnabled ? '--' :
             (uptime?.totalChecks === 0 ? '--' : 
             (uptime?.avgResponseTime ? `${uptime.avgResponseTime} ms` : '--')), 
      icon: Zap, 
      sparkline: 'M 0 12 L 30 12 L 45 4 L 60 16 L 75 12 L 120 12'
    },
    { 
      label: 'ERROR RATE', 
      sublabel: '24H ONGOING',
      value: errorsLoading ? '--' : errorGroups.filter(g => g.status === 'ONGOING').length.toString(), 
      icon: Layers, 
      sparkline: 'M 0 14 L 20 14 L 30 6 L 40 14 L 120 14'
    },
    { 
      label: 'ACTIVE INCIDENTS', 
      sublabel: 'CURRENT',
      value: !currentProject.monitoringEnabled ? '--' : activeIncidents.length.toString(), 
      icon: AlertCircle, 
      sparkline: 'M 0 10 L 120 10'
    },
  ];

  return (
    <div className={styles.container}>
      {/* Compact System Status Strip */}
      <section className={styles.statusStrip}>
        <div className={styles.stripHeader}>
          <div className={styles.stripTitleGroup}>
            <div className={styles.systemTag}>
              SYSTEM OVERVIEW • SIGNAL CONTROL
            </div>
            <h1 className={styles.stripTitle}>
              {currentProject.name} Console
            </h1>
          </div>

          <div className={styles.stripMetrics}>
            <div className={styles.stripMetricItem}>
              <span className={styles.stripMetricLabel}>SYSTEM STATUS</span>
              <StatusIndicator status={currentProject.integrationStatus} />
            </div>

            <div className={styles.stripMetricItem}>
              <span className={styles.stripMetricLabel}>LAST SIGNAL</span>
              <span className={styles.stripMetricValue}>
                {integration?.lastHeartbeatAt ? new Date(integration.lastHeartbeatAt).toLocaleTimeString() : 'ACTIVE'}
              </span>
            </div>

            <div className={styles.stripMetricItem}>
              <span className={styles.stripMetricLabel}>TARGETS</span>
              <span className={styles.stripMetricValue}>3 ACTIVE</span>
            </div>

            <div className={styles.stripMetricItem}>
              <span className={styles.stripMetricLabel}>INCIDENTS</span>
              <span className={styles.stripMetricValue}>{activeIncidents.length}</span>
            </div>

            {currentProject.integrationStatus !== 'CONNECTED' && (
              <Button size="sm" onClick={() => navigate('/setup')} style={{ background: 'var(--color-primary)', color: '#080A0F', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                <Terminal size={14} style={{ marginRight: '6px' }} /> CONNECT <ArrowRight size={12} style={{ marginLeft: '4px' }} />
              </Button>
            )}
          </div>
        </div>

        {/* Signature Animated Signal Waveform */}
        <div className={styles.signalLineWrapper}>
          <SignalLine color="var(--color-primary)" height={18} animated={true} />
        </div>
      </section>

      {/* Progression Track */}
      {progressPercent < 100 && (
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div className={styles.progressTitle}>
              <ShieldCheck size={14} className={styles.iconInfo} />
              PROGRESSION TRACK
            </div>
            <div className={styles.progressPercent}>{progressPercent}% CONNECTED</div>
          </div>

          <div className={styles.progressBarBg}>
            <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
          </div>

          <div className={styles.progressTrack}>
            {setupSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className={`${styles.trackStep} ${step.completed ? styles.trackStepComplete : ''}`}>
                  <span>{step.completed ? '✓' : step.num}</span>
                  <span>{step.label}</span>
                </div>
                {idx < setupSteps.length - 1 && <div className={styles.trackLine} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Instrument Metric Cards Grid */}
      <div className={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className={styles.statCardContent}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>{stat.label}</span>
                <span className={styles.statSublabel}>{stat.sublabel}</span>
              </div>

              <span className={styles.statValue}>{stat.value}</span>

              <div className={styles.microViz}>
                <svg width="100%" height="16" viewBox="0 0 120 16" fill="none">
                  <path d={stat.sparkline} stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.8" />
                </svg>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid Layout */}
      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          {/* Target Monitoring Panel */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={16} className={styles.iconInfo} /> MONITORED TARGETS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.targetStatusList}>
                {/* Agent Target */}
                <div className={styles.targetStatus}>
                  <div className={styles.targetInfo}>
                    <div className={styles.targetHeader}>
                      <Terminal size={14} className={styles.iconInfo} />
                      <span className={styles.targetName}>Scrum Master Agent Integration</span>
                    </div>
                    <span className={styles.targetUrl}>Heartbeat Protocol</span>
                  </div>

                  <div className={styles.targetLineRail}>
                    <SignalLine color="var(--color-success)" height={12} animated={currentProject.integrationStatus === 'CONNECTED'} />
                  </div>

                  {currentProject.integrationStatus === 'CONNECTED' ? (
                    <div className={styles.targetMetrics}>
                      <span className={styles.metricLatency}>
                        {integration?.lastHeartbeatAt ? new Date(integration.lastHeartbeatAt).toLocaleTimeString() : 'Active'}
                      </span>
                      <StatusIndicator status="CONNECTED" />
                    </div>
                  ) : (
                    <div className={styles.targetMetrics}>
                      <Button variant="outline" size="sm" onClick={() => navigate('/setup')}>Setup</Button>
                      <StatusIndicator status={currentProject.integrationStatus} />
                    </div>
                  )}
                </div>

                {/* Frontend Target */}
                <div className={styles.targetStatus}>
                  <div className={styles.targetInfo}>
                    <span className={styles.targetName}>Frontend Application</span>
                    <span className={styles.targetUrl}>{currentProject.frontendUrl || 'Not configured'}</span>
                  </div>

                  <div className={styles.targetLineRail}>
                    <SignalLine color={frontendCheck?.status === 'up' ? 'var(--color-success)' : 'var(--color-border)'} height={12} animated={Boolean(frontendCheck)} />
                  </div>

                  {currentProject.frontendUrl ? (
                    frontendCheck ? (
                      <div className={styles.targetMetrics}>
                        <span className={styles.metricLatency}>{frontendCheck.responseTime}ms</span>
                        <StatusIndicator status={frontendCheck.status.toUpperCase()} />
                      </div>
                    ) : (
                      <span className={styles.textMuted}>Awaiting signal...</span>
                    )
                  ) : (
                    <span className={styles.textMuted}>Unconfigured</span>
                  )}
                </div>

                {/* Backend API Target */}
                <div className={styles.targetStatus}>
                  <div className={styles.targetInfo}>
                    <span className={styles.targetName}>Backend API Service</span>
                    <span className={styles.targetUrl}>{currentProject.backendUrl || 'Not configured'}</span>
                  </div>

                  <div className={styles.targetLineRail}>
                    <SignalLine color={backendCheck?.status === 'up' ? 'var(--color-success)' : 'var(--color-border)'} height={12} animated={Boolean(backendCheck)} />
                  </div>

                  {currentProject.backendUrl ? (
                    backendCheck ? (
                      <div className={styles.targetMetrics}>
                        <span className={styles.metricLatency}>{backendCheck.responseTime}ms</span>
                        <StatusIndicator status={backendCheck.status.toUpperCase()} />
                      </div>
                    ) : (
                      <span className={styles.textMuted}>Awaiting signal...</span>
                    )
                  ) : (
                    <span className={styles.textMuted}>Unconfigured</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Signal Center */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={16} className={styles.iconWarning} /> ERROR SIGNAL CENTER
                </span>
                <Button variant="outline" size="sm" onClick={() => navigate('/errors')}>
                  View Error Center
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <div className={styles.textMuted}>Loading error signals...</div>
              ) : (
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'var(--font-mono)' }}>
                      {errorGroups.reduce((acc, g) => acc + g.occurrenceCount, 0).toLocaleString()}
                    </span>
                    <span className={styles.textMuted}>Occurrences (24h)</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <StatusIndicator status="ATTENTION" label={`${errorGroups.filter(g => g.status === 'ONGOING').length} ONGOING`} />
                    <StatusIndicator status="CRITICAL" label={`${errorGroups.filter(g => g.severity === 'CRITICAL').length} CRITICAL`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback Console */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={16} className={styles.iconInfo} /> FEEDBACK CONSOLE
                </span>
                <Button variant="outline" size="sm" onClick={() => navigate('/feedback')}>
                  View Feedback Hub
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'var(--font-mono)' }}>
                    {unreadCount}
                  </span>
                  <span className={styles.textMuted}>Unread {unreadCount === 1 ? 'message' : 'messages'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Telemetry Console Event Stream */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card style={{ height: '100%' }}>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} className={styles.iconInfo} /> TELEMETRY EVENT STREAM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.activityList}>
                {history.length > 0 ? (
                  history.map((check) => (
                    <div key={check.id} className={styles.activityItem}>
                      <div className={`${styles.activityDot} ${check.status !== 'up' ? styles.activityDotError : ''}`} />
                      <div className={styles.activityDetails}>
                        <span className={styles.activityText}>{check.target.toUpperCase()} CHECK {check.status.toUpperCase()}</span>
                        <span className={styles.activityMeta}>{new Date(check.checkedAt).toLocaleTimeString()} • {check.responseTime}ms</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '1.75rem 1rem', textAlign: 'center' }}>
                    <Activity size={32} className={styles.textMuted} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
                    <p style={{ fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>NO EVENT SIGNALS RECORDED</p>
                    <p className={styles.textMuted}>Signals will appear here once checks execute.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
