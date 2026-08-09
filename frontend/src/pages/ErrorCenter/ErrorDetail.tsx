import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useErrorStore } from '../../stores/errorStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ArrowLeft, Clock, Copy, Check, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import styles from './ErrorCenter.module.css';

export const ErrorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const { 
    currentGroup, 
    currentEvents, 
    fetchGroupDetails, 
    fetchGroupEvents,
    resolveGroup,
    reset
  } = useErrorStore();
  
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentProject && id) {
      fetchGroupDetails(currentProject.id, id);
      fetchGroupEvents(currentProject.id, id, 1);
    }
    
    return () => reset();
  }, [currentProject, id, fetchGroupDetails, fetchGroupEvents, reset]);

  const handleResolve = async () => {
    if (currentProject && id) {
      await resolveGroup(currentProject.id, id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentProject || !currentGroup) return null;

  return (
    <div className={styles.container}>
      <div className={styles.detailHeader}>
        <div className={styles.titleSection}>
          <Button variant="outline" onClick={() => navigate('/errors')} style={{ width: 'fit-content', padding: '0.25rem 0.5rem' }}>
            <ArrowLeft size={16} style={{ marginRight: '0.25rem' }} /> Back to Errors
          </Button>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
            <Badge variant={currentGroup.severity === 'ERROR' || currentGroup.severity === 'CRITICAL' ? 'error' : 'warning'}>
              {currentGroup.severity}
            </Badge>
            <h1 className={styles.detailTitle}>{currentGroup.errorType}</h1>
          </div>
          <p className="text-secondary" style={{ fontSize: '1.1rem', margin: '0.25rem 0 0 0' }}>
            {currentGroup.message}
          </p>
        </div>
        <div>
          {currentGroup.status !== 'RESOLVED' && (
            <Button variant="primary" onClick={handleResolve}>
              Mark as Resolved
            </Button>
          )}
          {currentGroup.status === 'RESOLVED' && (
            <Badge variant="success">RESOLVED</Badge>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Source</span>
          <span className={styles.statValue}>{currentGroup.source} ({currentGroup.environment})</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Endpoint</span>
          <span className={styles.statValue}>{currentGroup.endpoint || 'N/A'}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Occurrences</span>
          <span className={styles.statValue}>{currentGroup.occurrenceCount.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Last Seen</span>
          <span className={styles.statValue}>{format(new Date(currentGroup.lastSeenAt), 'MMM d, HH:mm:ss')}</span>
        </div>
      </div>

      {currentEvents.length > 0 && currentEvents[0].stackTrace && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} /> Stack Trace
              </CardTitle>
              <Button variant="outline" onClick={() => copyToClipboard(currentEvents[0].stackTrace!)}>
                {copied ? <Check size={16} /> : <Copy size={16} />} 
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className={styles.codeBlock}>
              {currentEvents[0].stackTrace}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Occurrences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.eventsList}>
            {currentEvents.map((event) => (
              <div key={event.id} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={14} />
                    {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm:ss.SSS')}
                  </span>
                  {event.method && event.endpoint && (
                    <span style={{ fontFamily: 'monospace' }}>{event.method} {event.endpoint}</span>
                  )}
                </div>
                {/* Could show extra metadata here if collected */}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
