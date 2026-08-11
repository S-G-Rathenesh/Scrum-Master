import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useErrorStore } from '../../stores/errorStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProjectRequiredEmptyState } from '../../components/common/ProjectRequiredEmptyState';
import { AlertCircle, Filter, Clock } from 'lucide-react';
import { type ErrorSeverity, type ErrorStatus, type ErrorSource } from '../../services/errors';
import styles from './ErrorCenter.module.css';
import { formatDistanceToNow } from 'date-fns';

export const ErrorCenter: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { 
    groups, 
    isLoading, 
    filters, 
    setFilters, 
    fetchGroups, 
    totalPages,
    totalGroups
  } = useErrorStore();
  
  const navigate = useNavigate();

  useEffect(() => {
    if (currentProject) {
      fetchGroups(currentProject.id);
    }
  }, [currentProject, filters.status, filters.severity, filters.source, filters.time_range, filters.page, fetchGroups]);

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'ERROR': return 'error';
      case 'WARNING': return 'warning';
      default: return 'info';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'error';
      case 'ONGOING': return 'warning';
      case 'RESOLVED': return 'success';
      default: return 'default';
    }
  };

  if (!currentProject) {
    return <ProjectRequiredEmptyState message="Select a project to view application errors." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle className="text-danger" /> Error Center
          </h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>
            Monitor and diagnose application failures for {currentProject.name}
          </p>
        </div>
      </div>

      <Card>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }} className={styles.filters}>
          <Filter size={16} className="text-secondary" />
          
          <select 
            className={styles.filterSelect}
            value={filters.status || ''}
            onChange={(e) => setFilters({ status: (e.target.value || undefined) as ErrorStatus, page: 1 })}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ONGOING">Ongoing</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filters.severity || ''}
            onChange={(e) => setFilters({ severity: (e.target.value || undefined) as ErrorSeverity, page: 1 })}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filters.source || ''}
            onChange={(e) => setFilters({ source: (e.target.value || undefined) as ErrorSource, page: 1 })}
          >
            <option value="">All Sources</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="api">API</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filters.time_range}
            onChange={(e) => setFilters({ time_range: e.target.value as any, page: 1 })}
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        {isLoading && groups.length === 0 ? (
          <div className={styles.emptyState}>Loading errors...</div>
        ) : groups.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={48} style={{ opacity: 0.5 }} />
            <h3>No Application Errors Detected</h3>
            <p>We haven't received any errors matching these filters.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Error</th>
                    <th>Status</th>
                    <th>Events</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr 
                      key={group.id} 
                      className={styles.row}
                      onClick={() => navigate(`/errors/${group.id}`)}
                    >
                      <td>
                        <div className={styles.errorInfo}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Badge variant={getSeverityColor(group.severity)}>{group.severity}</Badge>
                            <span className={styles.errorType}>{group.errorType}</span>
                          </div>
                          <div className={styles.errorMessage}>{group.message}</div>
                          <div className={styles.meta}>
                            <span>{group.source}</span>
                            {group.endpoint && (
                              <>
                                <span>•</span>
                                <code style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                  {group.endpoint}
                                </code>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={getStatusColor(group.status)}>{group.status}</Badge>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{group.occurrenceCount.toLocaleString()}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          {formatDistanceToNow(new Date(group.lastSeenAt), { addSuffix: true })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className={styles.pagination} style={{ padding: '1rem' }}>
              <span className="text-secondary">
                Showing {groups.length} of {totalGroups} error groups
              </span>
              <div className={styles.paginationControls}>
                <Button 
                  variant="outline" 
                  disabled={filters.page === 1}
                  onClick={() => handlePageChange(filters.page - 1)}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline"
                  disabled={filters.page >= totalPages}
                  onClick={() => handlePageChange(filters.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
