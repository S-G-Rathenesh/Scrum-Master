import React from 'react';

interface SignalLineProps {
  className?: string;
  color?: string;
  height?: number;
  width?: string | number;
  animated?: boolean;
  style?: React.CSSProperties;
}

export const SignalLine: React.FC<SignalLineProps> = ({
  className,
  color = 'var(--color-primary)',
  height = 24,
  width = '100%',
  animated = true,
  style,
}) => {
  return (
    <div 
      className={className} 
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        ...style
      }}
    >
      <svg
        width="100%"
        height={height}
        viewBox="0 0 400 24"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 0 12 L 120 12 L 132 4 L 144 20 L 156 8 L 168 12 L 260 12 L 272 6 L 284 18 L 296 12 L 400 12"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={animated ? "0.85" : "0.5"}
        />
        {animated && (
          <path
            d="M 0 12 L 120 12 L 132 4 L 144 20 L 156 8 L 168 12 L 260 12 L 272 6 L 284 18 L 296 12 L 400 12"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60 340"
            style={{
              animation: 'signalLinePulse 4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              filter: `drop-shadow(0 0 4px ${color})`
            }}
          />
        )}
      </svg>
    </div>
  );
};
