import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ArrowLeft, Clock, Mail, User, Tag, Layout, Send, CheckCircle2, CornerDownLeft } from 'lucide-react';
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

  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccessMsg, setReplySuccessMsg] = useState('');

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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !id || !replyText.trim()) return;

    setIsSendingReply(true);
    setReplySuccessMsg('');

    try {
      await updateFeedbackStatus(currentProject.id, id, {
        reply: replyText.trim(),
        status: 'RESOLVED'
      });
      await fetchFeedbackDetail(currentProject.id, id);
      setReplySuccessMsg('✓ Reply sent successfully');
      setReplyText('');
      setTimeout(() => setReplySuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReply(false);
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
          <span className={styles.statLabel}>Application</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Layout size={16} className="text-secondary" />
            <span className={styles.statValue}>{currentProject.name}</span>
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

      {/* MANAGER REPLY INTERFACE */}
      <Card style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <CornerDownLeft size={18} style={{ color: 'var(--color-primary)' }} />
            Reply
          </h3>

          {currentFeedback.reply && (
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Previous Reply • {currentFeedback.repliedAt ? format(new Date(currentFeedback.repliedAt), 'MMM d, yyyy HH:mm') : 'Recently'}
              </div>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{currentFeedback.reply}</div>
            </div>
          )}

          <form onSubmit={handleSendReply}>
            <textarea
              className={styles.filterSelect}
              rows={4}
              placeholder="Write your reply here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={isSendingReply}
              style={{ width: '100%', resize: 'vertical', marginBottom: '1rem', minHeight: '100px' }}
            />

            {replySuccessMsg && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--color-success)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> {replySuccessMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSendingReply || !replyText.trim()}
              style={{
                background: 'var(--color-primary)',
                color: '#080A0F',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}
            >
              <Send size={14} style={{ marginRight: '0.4rem' }} />
              {isSendingReply ? 'SENDING REPLY...' : 'SEND REPLY'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
