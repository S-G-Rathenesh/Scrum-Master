import React from 'react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import styles from '../Analytics.module.css';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'error' | 'default';
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  badgeText,
  badgeVariant = 'default',
  accentColor
}) => {
  return (
    <Card className={styles.kpiCard}>
      {accentColor && (
        <div 
          className={styles.kpiAccentBar} 
          style={{ backgroundColor: accentColor }} 
        />
      )}
      <div className={styles.kpiHeader}>
        <span className={styles.kpiTitle}>{title}</span>
        {icon && <div className={styles.kpiIcon}>{icon}</div>}
      </div>
      <div className={styles.kpiValueGroup}>
        <span className={styles.kpiValue}>{value}</span>
        {badgeText && (
          <Badge variant={badgeVariant} className={styles.kpiBadge}>
            {badgeText}
          </Badge>
        )}
      </div>
      {subtext && <p className={styles.kpiSubtext}>{subtext}</p>}
    </Card>
  );
};
