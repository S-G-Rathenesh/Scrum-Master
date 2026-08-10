import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { MessageSquare, Filter, Clock } from 'lucide-react';
import styles from './FeedbackHub.module.css';
import { formatDistanceToNow } from 'date-fns';

export const FeedbackHub: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { 
    items, 
    isLoading, 
    filters, 
    setFilters, 
    fetchFeedback, 
    totalPages,
    total
  } = useFeedbackStore();
  
  const navigate = useNavigate();

  useEffect(() => {
    if (currentProject) {
      fetchFeedback(currentProject.id);
    }
  }, [currentProject, filters.status, filters.priority, filters.category, filters.is_read, filters.page, fetchFeedback]);

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'error';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'ARCHIVED': return 'default';
      default: return 'default';
    }
  };

  if (!currentProject) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare className="text-info" /> Feedback Hub
          </h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>
            Manage user feedback, bug reports, and contact messages for {currentProject.name}.
          </p>
        </div>
      </div>

      <Card>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }} className={styles.filters}>
          <Filter size={16} className="text-secondary" />
          
          <select 
            className={styles.filterSelect}
            value={filters.is_read !== undefined ? filters.is_read.toString() : ''}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({ is_read: val === '' ? undefined : val === 'true', page: 1 });
            }}
          >
            <option value="">All Messages</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filters.status || ''}
            onChange={(e) => setFilters({ status: e.target.value || undefined, page: 1 })}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filters.priority || ''}
            onChange={(e) => setFilters({ priority: e.target.value || undefined, page: 1 })}
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={filters.category || ''}
            onChange={(e) => setFilters({ category: e.target.value || undefined, page: 1 })}
          >
            <option value="">All Categories</option>
            <option value="GENERAL">General</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="COMPLAINT">Complaint</option>
            <option value="QUESTION">Question</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {isLoading && items.length === 0 ? (
          <div className={styles.emptyState}>Loading feedback...</div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={48} style={{ opacity: 0.5 }} />
            <h3>No feedback received yet.</h3>
            <p>No feedback messages match your current filters.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Subject / Message</th>
                    <th>Sender</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`${styles.row} ${!item.isRead ? styles.rowUnread : ''}`}
                      onClick={() => navigate(`/feedback/${item.id}`)}
                    >
                      <td>
                        <div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {!item.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)' }} />}
                            <span style={{ fontWeight: item.isRead ? 400 : 600 }}>{item.subject || 'No Subject'}</span>
                          </div>
                          <div className={styles.messagePreview}>{item.message}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{item.name || 'Anonymous'}</span>
                          <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{item.email || 'No email'}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant="default">{item.category.replace('_', ' ')}</Badge>
                      </td>
                      <td>
                        <Badge variant={getStatusColor(item.status)}>{item.status.replace('_', ' ')}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className={styles.pagination} style={{ padding: '1rem' }}>
              <span className="text-secondary">
                Showing {items.length} of {total} messages
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
