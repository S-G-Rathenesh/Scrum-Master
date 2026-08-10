import React from 'react';

interface StatusIndicatorProps {
  status: 'CONNECTED' | 'OPERATIONAL' | 'WAITING' | 'DISCONNECTED' | 'UP' | 'DOWN' | 'ONGOING' | 'CRITICAL' | string;
  label?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  showText = true,
  size = 'md'
}) => {
  const normalized = status?.toUpperCase() || '';
  
  let color = 'var(--color-primary)';
  let glowColor = 'rgba(245, 185, 66, 0.4)';
  let text = label || normalized;

  if (normalized === 'CONNECTED' || normalized === 'OPERATIONAL' || normalized === 'UP' || normalized === 'HEALTHY') {
    color = 'var(--color-success)';
    glowColor = 'rgba(16, 185, 129, 0.4)';
    text = label || (normalized === 'UP' ? 'UP' : 'OPERATIONAL');
  } else if (normalized === 'WAITING' || normalized === 'ONGOING' || normalized === 'ATTENTION') {
    color = 'var(--color-primary)';
    glowColor = 'rgba(245, 185, 66, 0.4)';
    text = label || 'WAITING';
  } else if (normalized === 'DISCONNECTED' || normalized === 'DOWN' || normalized === 'CRITICAL' || normalized === 'INCIDENT') {
    color = 'var(--color-error)';
    glowColor = 'rgba(239, 68, 68, 0.4)';
    text = label || (normalized === 'DOWN' ? 'DOWN' : 'INCIDENT');
  }

  const dotSize = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontFamily: 'var(--font-mono)' }}>
      <div 
        style={{
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 8px ${glowColor}`,
          position: 'relative',
          flexShrink: 0
        }}
      >
        <div 
          style={{
            position: 'absolute',
            inset: '-3px',
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            opacity: 0.6,
            animation: 'pulseRing 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite'
          }}
        />
      </div>
      {showText && (
        <span 
          style={{
            fontSize: size === 'sm' ? '0.75rem' : '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: color,
            textTransform: 'uppercase'
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
};
