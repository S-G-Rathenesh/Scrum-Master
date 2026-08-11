import React from 'react';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import styles from './ProjectRequiredEmptyState.module.css';

interface ProjectRequiredEmptyStateProps {
  message?: string;
}

export const ProjectRequiredEmptyState: React.FC<ProjectRequiredEmptyStateProps> = ({
  message = "Select a project from the top workspace selector or register a new system to inspect its control center."
}) => {
  const navigate = useNavigate();
  return (
    <div className={styles.emptyStateContainer}>
      <div className={styles.emptyStateBox}>
        <Activity size={36} className={styles.iconInfo} style={{ margin: '0 auto 1rem' }} />
        <h2 className={styles.emptyStateTitle}>NO PROJECT SELECTED</h2>
        <p className={styles.emptyStateDesc}>
          {message}
        </p>
        <Button onClick={() => navigate('/setup')} variant="outline">
          ADD PROJECT
        </Button>
      </div>
    </div>
  );
};
