import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ProjectRequiredEmptyState } from '../../components/common/ProjectRequiredEmptyState';
import styles from './Notifications.module.css';
import { 
  Bell, 
  MessageSquare, 
  AlertTriangle, 
  Info, 
  CheckCheck, 
  Clock, 
  Trash2, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (currentProject) {
      fetchNotifications(currentProject.id);
    }
  }, [currentProject, fetchNotifications]);

  if (!currentProject) {
    return <ProjectRequiredEmptyState message="Select a project to view notifications." />;
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead && currentProject) {
      await markAsRead(currentProject.id, n.id);
    }

    if (n.relatedEntity === 'feedback' && n.relatedId) {
      navigate(`/feedback?id=${n.relatedId}`);
    } else if (n.relatedEntity === 'error' && n.relatedId) {
      navigate(`/errors?groupId=${n.relatedId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_FEEDBACK':
        return <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} />;
      case 'CRITICAL_ERROR':
      case 'INCIDENT':
        return <AlertTriangle size={18} style={{ color: 'var(--color-error)' }} />;
      default:
        return <Info size={18} style={{ color: 'var(--color-secondary)' }} />;
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            Stay updated on new feedback, alerts, and system notifications for {currentProject.name}.
          </p>
        </div>

        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => currentProject && markAllAsRead(currentProject.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-main)',
                fontSize: '0.85rem'
              }}
            >
              <CheckCheck size={16} style={{ color: 'var(--color-success)' }} />
              Mark All as Read
            </Button>
          )}
        </div>
      </header>

      {/* FILTER BAR */}
      <div className={styles.filterBar}>
        <div className={styles.tabGroup}>
          <button
            className={`${styles.tabBtn} ${filter === 'all' ? styles.activeTab : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`${styles.tabBtn} ${filter === 'unread' ? styles.activeTab : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* NOTIFICATIONS LIST */}
      {isLoading && notifications.length === 0 ? (
        <Card style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading notifications...
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card style={{ padding: '3rem 2rem' }}>
          <EmptyState
            icon={<Bell size={40} style={{ opacity: 0.5 }} />}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description={
              filter === 'unread'
                ? "You've read all your notifications for this project."
                : "New feedback submissions and system events will appear here automatically."
            }
          />
        </Card>
      ) : (
        <div className={styles.notificationList}>
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`${styles.notificationCard} ${!n.isRead ? styles.unreadCard : ''}`}
              onClick={() => handleNotificationClick(n)}
            >
              <div className={styles.iconWrapper}>
                {getNotificationIcon(n.type)}
              </div>

              <div className={styles.contentWrapper}>
                <div className={styles.itemHeader}>
                  <h4 className={styles.itemTitle}>
                    {!n.isRead && <span className={styles.unreadDot} title="Unread" />}
                    {n.title}
                  </h4>
                  <span className={styles.itemTime}>
                    <Clock size={13} />
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <p className={styles.itemMessage}>{n.message}</p>

                <div className={styles.itemFooter}>
                  {n.relatedEntity === 'feedback' && (
                    <Badge variant="warning" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}>
                      Feedback
                    </Badge>
                  )}
                  {n.relatedEntity === 'error' && (
                    <Badge variant="error" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}>
                      Error
                    </Badge>
                  )}
                  <span style={{ fontSize: '0.775rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, marginLeft: 'auto' }}>
                    View Details <ArrowRight size={13} />
                  </span>
                </div>
              </div>

              <div className={styles.actionRow} onClick={(e) => e.stopPropagation()}>
                {!n.isRead && (
                  <button
                    className={styles.actionBtn}
                    title="Mark as Read"
                    onClick={() => currentProject && markAsRead(currentProject.id, n.id)}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                <button
                  className={styles.actionBtn}
                  title="Delete Notification"
                  onClick={() => currentProject && deleteNotification(currentProject.id, n.id)}
                >
                  <Trash2 size={16} style={{ color: 'var(--color-error)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
