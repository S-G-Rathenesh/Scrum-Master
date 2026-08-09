import React from 'react';
import styles from './Badge.module.css';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={twMerge(clsx(styles.badge, styles[`variant-${variant}`], className))}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
