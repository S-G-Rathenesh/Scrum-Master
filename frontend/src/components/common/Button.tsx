import React from 'react';
import styles from './Button.module.css';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          clsx(
            styles.button,
            styles[`variant-${variant}`],
            styles[`size-${size}`],
            fullWidth && styles.fullWidth,
            className
          )
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
