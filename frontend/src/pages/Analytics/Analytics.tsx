import React, { useEffect } from 'react';
import { useAnalyticsStore, type TimeRange } from '../../stores/analyticsStore';
import { useProjectStore } from '../../stores/projectStore';
import styles from './Analytics.module.css';
import { Activity, Clock, AlertTriangle, RefreshCw, Info } from 'lucide-react';
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
        <div className={styles.emptyState}>
          <Activity size={48} className={styles.emptyStateIcon} />
          <h2 className={styles.emptyStateTitle}>No Project Selected</h2>
          <p className={styles.emptyStateText}>Please select a project to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Project Analytics</h1>
        <div className={styles.controls}>
          <select 
            className={styles.select} 
            value={timeRange} 
            onChange={handleTimeRangeChange}
            disabled={isLoading}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button 
            className={styles.refreshButton} 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {timeRange === '30d' && (
        <div className={styles.alertWarning}>
          <Info size={20} />
          <span>
            <strong>Data Retention Notice:</strong> 30-day detailed monitoring history is limited by the current 7-day data retention policy. Uptime and latency metrics will only reflect the last 7 days of available raw checks.
          </span>
        </div>
      )}

      {error ? (
        <div className={styles.emptyState}>
          <AlertTriangle size={48} className={styles.emptyStateIcon} color="#EF4444" />
          <h2 className={styles.emptyStateTitle}>Failed to load analytics</h2>
          <p className={styles.emptyStateText}>{error}</p>
          <button className={styles.refreshButton} style={{ margin: '1rem auto 0' }} onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      ) : isLoading && !overview ? (
        <AnalyticsSkeleton />
      ) : overview ? (
        <>
          <div className={styles.grid}>
            {/* Health Score */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Overall Health</h3>
                <Activity size={20} className={styles.cardIcon} />
              </div>
              <p className={styles.cardValue}>{overview.health.score}</p>
              <span className={`${styles.badge} ${
                overview.health.status === 'Healthy' ? styles.badgeHealthy :
                overview.health.status === 'Degraded' ? styles.badgeDegraded :
                overview.health.status === 'Critical' ? styles.badgeCritical : styles.badgeCollecting
              }`}>
                {overview.health.status}
              </span>
            </div>

            {/* Uptime */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Uptime</h3>
                <Clock size={20} className={styles.cardIcon} />
              </div>
              <p className={styles.cardValue}>
                {overview.uptime.hasData ? `${overview.uptime.uptimePercentage.toFixed(2)}%` : '--'}
              </p>
              <p className={styles.cardSubtext}>
                {overview.uptime.totalChecks} checks in range
              </p>
            </div>

            {/* Latency */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Avg Response</h3>
                <Activity size={20} className={styles.cardIcon} />
              </div>
              <p className={styles.cardValue}>
                {overview.performance.averageLatency > 0 ? `${Math.round(overview.performance.averageLatency)} ms` : '--'}
              </p>
              <p className={styles.cardSubtext}>
                Min: {Math.round(overview.performance.minLatency)}ms | Max: {Math.round(overview.performance.maxLatency)}ms
              </p>
            </div>

            {/* Incidents */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Active Incidents</h3>
                <AlertTriangle size={20} className={styles.cardIcon} />
              </div>
              <p className={styles.cardValue}>{overview.incidents.activeIncidents}</p>
              <p className={styles.cardSubtext}>
                {overview.incidents.totalIncidents} total in range
              </p>
            </div>
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Uptime Trend</h3>
              {overview.uptime.trend.length > 0 ? (
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.uptime.trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatChartDate} 
                        stroke="var(--text-muted)" 
                        fontSize={12} 
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[80, 100]} 
                        stroke="var(--text-muted)" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                        labelFormatter={(l: any) => l ? new Date(l).toLocaleString() : ''}
                        formatter={(val: any) => {
                          const v = typeof val === 'number' ? val : 0;
                          return [`${v.toFixed(2)}%`, 'Uptime'];
                        }}
                      />
                      <Line type="monotone" dataKey="uptimePercentage" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={styles.chartContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p className={styles.cardSubtext}>Not enough monitoring data yet.</p>
                </div>
              )}
            </div>

            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Response Time Trend</h3>
              {overview.performance.trend.length > 0 ? (
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.performance.trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatChartDate} 
                        stroke="var(--text-muted)" 
                        fontSize={12} 
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="var(--text-muted)" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}ms`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                        labelFormatter={(l: any) => l ? new Date(l).toLocaleString() : ''}
                        formatter={(val: any) => {
                          const v = typeof val === 'number' ? val : 0;
                          return [`${Math.round(v)}ms`, 'Latency'];
                        }}
                      />
                      <Line type="monotone" dataKey="latencyMs" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={styles.chartContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p className={styles.cardSubtext}>Not enough monitoring data yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.bottomGrid}>
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Application Errors</h3>
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
                <span className={styles.statValue}>{overview.errors.criticalErrors}</span>
              </div>
              
              <h4 style={{ fontSize: '0.875rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Top Errors</h4>
              {overview.errors.topErrors.length > 0 ? (
                <ul className={styles.errorList}>
                  {overview.errors.topErrors.map(err => (
                    <li key={err.id} className={styles.errorItem}>
                      <span className={styles.errorName}>{err.fingerprint}</span>
                      <span className={styles.errorCount}>{err.occurrenceCount}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.cardSubtext}>No application errors recorded.</p>
              )}
            </div>

            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>User Feedback</h3>
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

              <h4 style={{ fontSize: '0.875rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Categories</h4>
              {Object.keys(overview.feedback.categoryBreakdown).length > 0 ? (
                <ul className={styles.errorList}>
                  {Object.entries(overview.feedback.categoryBreakdown).map(([cat, count]) => (
                    <li key={cat} className={styles.errorItem}>
                      <span className={styles.errorName}>{cat}</span>
                      <span className={styles.errorCount}>{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.cardSubtext}>No feedback recorded.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const AnalyticsSkeleton = () => (
  <>
    <div className={styles.grid}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={styles.card}>
          <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '40%' }}></div>
        </div>
      ))}
    </div>
    <div className={styles.chartGrid}>
      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonChart}`}></div>
      </div>
      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonChart}`}></div>
      </div>
    </div>
  </>
);
