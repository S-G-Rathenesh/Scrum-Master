import React, { useEffect } from 'react';
import { useAnalyticsStore, type TimeRange } from '../../stores/analyticsStore';
import { useProjectStore } from '../../stores/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from './components/StatCard';
import styles from './Analytics.module.css';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  Zap, 
  BarChart2, 
  ShieldCheck, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const Analytics: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { overview, timeRange, isLoading, error, setTimeRange, fetchAnalytics, clearAnalytics } = useAnalyticsStore();

  useEffect(() => {
    if (currentProject) {
      fetchAnalytics(currentProject.id);
    } else {
      clearAnalytics();
    }
  }, [currentProject, fetchAnalytics, clearAnalytics]);

  const handleRefresh = () => {
    if (currentProject) fetchAnalytics(currentProject.id);
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (currentProject) {
      setTimeRange(e.target.value as TimeRange, currentProject.id);
    }
  };

  const formatChartDate = (isoString: string) => {
    const date = new Date(isoString);
    if (timeRange === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!currentProject) {
    return (
      <div className={styles.container}>
        <Card style={{ padding: '3rem 2rem' }}>
          <EmptyState
            icon={<Activity size={44} style={{ color: 'var(--color-primary)' }} />}
            title="No Project Selected"
            description="Please select a project from the top navigation dropdown to view application analytics."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* PAGE HEADER */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Project Analytics</h1>
          <p className={styles.headerSubtitle}>
            Monitor application health, performance, incidents, errors, and feedback for {currentProject.name}.
          </p>
        </div>
        <div className={styles.controls}>
          <select 
            className={styles.timeRangeSelect} 
            value={timeRange} 
            onChange={handleTimeRangeChange}
            disabled={isLoading}
            aria-label="Select Time Range"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh Analytics"
            style={{
              padding: '0.55rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-main)'
            }}
          >
            <RefreshCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </Button>
        </div>
      </header>

      {/* RETENTION NOTICE FOR 30D */}
      {timeRange === '30d' && (
        <div className={styles.alertNotice}>
          <Info size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Data Retention Notice:</strong> 30-day detailed history is limited by the current 7-day data retention policy. Uptime and latency metrics reflect available raw checks.
          </span>
        </div>
      )}

      {/* ERROR STATE */}
      {error ? (
        <Card style={{ padding: '3rem 2rem' }}>
          <EmptyState
            icon={<AlertCircle size={44} style={{ color: 'var(--color-error)' }} />}
            title="Failed to load analytics"
            description={error}
            action={
              <Button onClick={handleRefresh} style={{ background: 'var(--color-primary)', color: '#080A0F', fontWeight: 700 }}>
                Try Again
              </Button>
            }
          />
        </Card>
      ) : isLoading && !overview ? (
        <AnalyticsSkeleton />
      ) : overview ? (
        <>
          {/* KPI STAT CARDS */}
          <section className={styles.kpiGrid}>
            <StatCard
              title="Overall Health"
              value={overview.health.score}
              badgeText={overview.health.status}
              badgeVariant={
                overview.health.status === 'Healthy' ? 'success' :
                overview.health.status === 'Degraded' ? 'warning' :
                overview.health.status === 'Critical' ? 'error' : 'default'
              }
              icon={<ShieldCheck size={20} />}
              accentColor="var(--color-success)"
            />

            <StatCard
              title="Uptime"
              value={overview.uptime.hasData ? `${overview.uptime.uptimePercentage.toFixed(2)}%` : '--'}
              subtext={`${overview.uptime.totalChecks} checks in range`}
              icon={<Clock size={20} />}
              accentColor="var(--color-primary)"
            />

            <StatCard
              title="Avg Response"
              value={overview.performance.averageLatency > 0 ? `${Math.round(overview.performance.averageLatency)} ms` : '--'}
              subtext={`Min: ${Math.round(overview.performance.minLatency)}ms | Max: ${Math.round(overview.performance.maxLatency)}ms`}
              icon={<Zap size={20} />}
              accentColor="var(--color-secondary)"
            />

            <StatCard
              title="Active Incidents"
              value={overview.incidents.activeIncidents}
              subtext={`${overview.incidents.totalIncidents} total in range`}
              badgeText={overview.incidents.activeIncidents === 0 ? '0 Active' : `${overview.incidents.activeIncidents} Active`}
              badgeVariant={overview.incidents.activeIncidents === 0 ? 'success' : 'error'}
              icon={<AlertTriangle size={20} />}
              accentColor={overview.incidents.activeIncidents === 0 ? 'var(--color-success)' : 'var(--color-error)'}
            />
          </section>

          {/* CHART SECTION */}
          <section className={styles.chartGrid}>
            <Card className={styles.chartCard}>
              <CardHeader>
                <CardTitle className={styles.chartCardTitle}>
                  <Activity size={16} style={{ color: 'var(--color-success)' }} /> UPTIME TREND
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview.uptime.trend && overview.uptime.trend.length > 0 ? (
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overview.uptime.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.08)" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatChartDate} 
                          stroke="var(--color-text-muted)" 
                          fontSize={11} 
                          tickLine={false}
                        />
                        <YAxis 
                          domain={[80, 100]} 
                          stroke="var(--color-text-muted)" 
                          fontSize={11} 
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141824', borderColor: 'rgba(245, 185, 66, 0.3)', color: '#F3F4F6', borderRadius: '6px', fontSize: '0.85rem' }}
                          labelFormatter={(l: any) => l ? new Date(l).toLocaleString() : ''}
                          formatter={(val: any) => {
                            const v = typeof val === 'number' ? val : 0;
                            return [`${v.toFixed(2)}%`, 'Uptime'];
                          }}
                        />
                        <Line type="monotone" dataKey="uptimePercentage" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={<BarChart2 size={32} />}
                    title="Not enough monitoring data yet"
                    description="Monitoring data will appear here once your integration starts reporting uptime checks."
                  />
                )}
              </CardContent>
            </Card>

            <Card className={styles.chartCard}>
              <CardHeader>
                <CardTitle className={styles.chartCardTitle}>
                  <Zap size={16} style={{ color: 'var(--color-secondary)' }} /> RESPONSE TIME TREND
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview.performance.trend && overview.performance.trend.length > 0 ? (
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overview.performance.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.08)" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatChartDate} 
                          stroke="var(--color-text-muted)" 
                          fontSize={11} 
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="var(--color-text-muted)" 
                          fontSize={11} 
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}ms`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141824', borderColor: 'rgba(110, 168, 254, 0.3)', color: '#F3F4F6', borderRadius: '6px', fontSize: '0.85rem' }}
                          labelFormatter={(l: any) => l ? new Date(l).toLocaleString() : ''}
                          formatter={(val: any) => {
                            const v = typeof val === 'number' ? val : 0;
                            return [`${Math.round(v)}ms`, 'Latency'];
                          }}
                        />
                        <Line type="monotone" dataKey="latencyMs" stroke="#6EA8FE" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={<Zap size={32} />}
                    title="Not enough monitoring data yet"
                    description="Latency trends will appear here once your integration records response times."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* LOWER ANALYTICS SUMMARY */}
          <section className={styles.summaryGrid}>
            <Card>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} style={{ color: 'var(--color-error)' }} /> APPLICATION ERRORS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Total Occurrences</span>
                  <span className={styles.statValue}>{overview.errors.totalOccurrences}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Unique Error Groups</span>
                  <span className={styles.statValue}>{overview.errors.uniqueGroups}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Critical Unresolved</span>
                  <span className={styles.statValue} style={{ color: overview.errors.criticalErrors > 0 ? 'var(--color-error)' : 'inherit' }}>
                    {overview.errors.criticalErrors}
                  </span>
                </div>

                <h4 className={styles.subSectionHeader}>Top Errors</h4>
                {overview.errors.topErrors && overview.errors.topErrors.length > 0 ? (
                  <ul className={styles.itemList}>
                    {overview.errors.topErrors.map(err => (
                      <li key={err.id} className={styles.itemRow}>
                        <span className={styles.itemName}>{err.fingerprint}</span>
                        <span className={styles.itemCount}>{err.occurrenceCount}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    compact
                    title="No application errors recorded"
                    description="Your integrated application has zero recorded crash or error events."
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={16} style={{ color: 'var(--color-primary)' }} /> USER FEEDBACK
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Total Submissions</span>
                  <span className={styles.statValue}>{overview.feedback.totalFeedback}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>New</span>
                  <span className={styles.statValue}>{overview.feedback.newFeedback}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Resolved</span>
                  <span className={styles.statValue}>{overview.feedback.resolvedFeedback}</span>
                </div>

                <h4 className={styles.subSectionHeader}>Categories</h4>
                {overview.feedback.categoryBreakdown && Object.keys(overview.feedback.categoryBreakdown).length > 0 ? (
                  <ul className={styles.itemList}>
                    {Object.entries(overview.feedback.categoryBreakdown).map(([cat, count]) => (
                      <li key={cat} className={styles.itemRow}>
                        <span className={styles.itemName}>{cat}</span>
                        <span className={styles.itemCount}>{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    compact
                    title="No feedback recorded"
                    description="No user feedback messages have been submitted yet for this project."
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
};

const AnalyticsSkeleton = () => (
  <>
    <div className={styles.kpiGrid}>
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className={styles.kpiCard}>
          <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '40%' }}></div>
        </Card>
      ))}
    </div>
    <div className={styles.chartGrid}>
      <Card className={styles.chartCard}>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonChart}`}></div>
      </Card>
      <Card className={styles.chartCard}>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonChart}`}></div>
      </Card>
    </div>
  </>
);
