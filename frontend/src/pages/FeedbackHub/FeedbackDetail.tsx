import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ArrowLeft, Clock, Mail, User, Tag, Layout } from 'lucide-react';
import { format } from 'date-fns';
import styles from './FeedbackHub.module.css';

export const FeedbackDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const { 
    currentFeedback, 
    fetchFeedbackDetail,
    updateFeedbackStatus,
    reset
  } = useFeedbackStore();

  useEffect(() => {
    if (currentProject && id) {
      fetchFeedbackDetail(currentProject.id, id);
    }
    
    return () => reset();
  }, [currentProject, id, fetchFeedbackDetail, reset]);

  const handleStatusChange = async (status: any) => {
    if (currentProject && id) {
      await updateFeedbackStatus(currentProject.id, id, { status });
    }
  };

  const handlePriorityChange = async (priority: any) => {
    if (currentProject && id) {
      await updateFeedbackStatus(currentProject.id, id, { priority });
    }
  };

  const toggleReadStatus = async () => {
    if (currentProject && id && currentFeedback) {
      await updateFeedbackStatus(currentProject.id, id, { isRead: !currentFeedback.isRead });
    }
  };

  if (!currentProject || !currentFeedback) return null;

  return (
    <div className={styles.container}>
      <div className={styles.detailHeader}>
        <div className={styles.titleSection}>
          <Button variant="outline" onClick={() => navigate('/feedback')} style={{ width: 'fit-content', padding: '0.25rem 0.5rem' }}>
            <ArrowLeft size={16} style={{ marginRight: '0.25rem' }} /> Back to Inbox
          </Button>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
            <h1 className={styles.detailTitle}>{currentFeedback.subject || 'No Subject'}</h1>
          </div>
          <div className={styles.meta} style={{ marginTop: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14}/> {currentFeedback.name || 'Anonymous'}</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={14}/> {currentFeedback.email || 'No email provided'}</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> {format(new Date(currentFeedback.createdAt), 'MMM d, yyyy HH:mm')}</span>
          </div>
        </div>
        <div className={styles.actionsSection}>
          <select 
            className={styles.filterSelect} 
            value={currentFeedback.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select 
            className={styles.filterSelect}
            value={currentFeedback.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
          >
            <option value="LOW">Priority: Low</option>
            <option value="NORMAL">Priority: Normal</option>
            <option value="HIGH">Priority: High</option>
          </select>
          
          <Button variant="outline" onClick={toggleReadStatus}>
            Mark as {currentFeedback.isRead ? 'Unread' : 'Read'}
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Category</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Tag size={16} className="text-secondary" />
            <span className={styles.statValue}>{currentFeedback.category.replace('_', ' ')}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Source</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Layout size={16} className="text-secondary" />
            <span className={styles.statValue}>{currentFeedback.source.replace('_', ' ')}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Page URL</span>
          <span className={styles.statValue} style={{ fontSize: '0.875rem', wordBreak: 'break-all', marginTop: '0.25rem' }}>
            {currentFeedback.pageUrl ? (
              <a href={currentFeedback.pageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>
                {currentFeedback.pageUrl}
              </a>
            ) : 'N/A'}
          </span>
        </div>
      </div>

      <Card>
        <div className={styles.messageBody}>
          {currentFeedback.message}
        </div>
      </Card>
    </div>
  );
};
