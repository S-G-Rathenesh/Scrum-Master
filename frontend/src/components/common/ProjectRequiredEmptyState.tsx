import React, { useEffect, useState } from 'react';
import { 
  Bot, 
  Folder,
  FileText,
  BarChart2,
  TrendingUp,
  AlertTriangle,
  Heart,
  Activity,
  Gauge,
  MessageSquare,
  Bell,
  Users,
  Settings,
  Sparkles,
  Star
} from 'lucide-react';
import { Button } from './Button';
import styles from './ProjectRequiredEmptyState.module.css';

export type ProjectEmptyStateType = 
  | 'dashboard'
  | 'projects'
  | 'analytics'
  | 'errors'
  | 'api-health'
  | 'performance'
  | 'feedback'
  | 'notifications'
  | 'members'
  | 'settings';

interface ProjectRequiredEmptyStateProps {
  type?: ProjectEmptyStateType;
  message?: string;
}

const CharacterIllustration: React.FC<{ type: ProjectEmptyStateType }> = ({ type }) => {
  switch (type) {
    case 'dashboard':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Bot size={64} strokeWidth={1.5} />
            <div className={styles.face}>
              <div className={styles.eye} />
              <div className={styles.eye} />
              <div className={styles.smile} />
            </div>
          </div>
          <Star className={styles.floatingAccent} size={24} fill="var(--color-primary)" color="var(--color-primary)" style={{ top: '-10px', right: '-15px' }} />
        </div>
      );
    case 'projects':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Folder size={72} strokeWidth={1.5} fill="rgba(139, 92, 246, 0.2)" />
            <div className={styles.face} style={{ top: '60%' }}>
              <div className={styles.eye} />
              <div className={styles.eye} />
              <div className={styles.smile} />
            </div>
          </div>
          <FileText className={styles.floatingAccent} size={28} style={{ bottom: '-5px', right: '-10px', transform: 'rotate(15deg)' }} />
        </div>
      );
    case 'analytics':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <BarChart2 size={72} strokeWidth={1.5} />
            <div className={styles.face} style={{ bottom: '15px', top: 'auto', left: '60%' }}>
              <div className={styles.eye} />
              <div className={styles.eye} />
              <div className={styles.smile} />
            </div>
          </div>
          <TrendingUp className={styles.floatingAccent} size={32} style={{ top: '-15px', right: '-20px', color: '#10b981' }} />
        </div>
      );
    case 'errors':
      return (
        <div className={styles.characterGroup}>
          <div className={`${styles.characterBase} ${styles.errorGlow}`}>
            <AlertTriangle size={76} strokeWidth={1.5} color="#ef4444" />
            <div className={styles.face} style={{ top: '55%' }}>
              <div className={styles.eye} style={{ background: '#ef4444' }} />
              <div className={styles.eye} style={{ background: '#ef4444' }} />
              <div className={styles.frown} />
            </div>
          </div>
        </div>
      );
    case 'api-health':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Heart size={72} strokeWidth={1.5} fill="rgba(139, 92, 246, 0.3)" />
            <Activity className={styles.floatingAccent} size={32} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff' }} />
          </div>
        </div>
      );
    case 'performance':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Gauge size={72} strokeWidth={1.5} />
            <div className={styles.face} style={{ top: '65%' }}>
              <div className={styles.eye} />
              <div className={styles.eye} />
              <div className={styles.smile} />
            </div>
          </div>
        </div>
      );
    case 'feedback':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <MessageSquare size={72} strokeWidth={1.5} fill="rgba(139, 92, 246, 0.15)" />
            <div className={styles.face} style={{ top: '45%' }}>
              <div className={styles.eye} />
              <div className={styles.eye} />
              <div className={styles.smile} />
            </div>
          </div>
          <MessageSquare className={styles.floatingAccent} size={32} style={{ top: '-10px', right: '-20px', transform: 'scaleX(-1)' }} />
        </div>
      );
    case 'notifications':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Bell size={72} strokeWidth={1.5} fill="rgba(139, 92, 246, 0.2)" />
            <div className={styles.face} style={{ top: '55%' }}>
              <div className={styles.eye} />
              <div className={styles.eye} />
              <div className={styles.smile} />
            </div>
          </div>
          <div className={styles.notificationBadge} />
        </div>
      );
    case 'members':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Users size={72} strokeWidth={1.5} />
            <div className={styles.face} style={{ top: '40%', left: '35%' }}>
              <div className={styles.eye} style={{ width: '4px', height: '4px' }} />
              <div className={styles.eye} style={{ width: '4px', height: '4px' }} />
              <div className={styles.smile} style={{ width: '8px', height: '4px' }} />
            </div>
            <div className={styles.face} style={{ top: '50%', left: '70%' }}>
              <div className={styles.eye} style={{ width: '4px', height: '4px' }} />
              <div className={styles.eye} style={{ width: '4px', height: '4px' }} />
              <div className={styles.smile} style={{ width: '8px', height: '4px' }} />
            </div>
          </div>
        </div>
      );
    case 'settings':
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Settings size={72} strokeWidth={1.5} />
            <div className={styles.face}>
              <div className={styles.eye} />
              <div className={styles.eye} />
              <div className={styles.smile} />
            </div>
          </div>
          <Sparkles className={styles.floatingAccent} size={24} style={{ top: '-10px', right: '-15px', color: '#f59e0b' }} />
        </div>
      );
    default:
      return (
        <div className={styles.characterGroup}>
          <div className={styles.characterBase}>
            <Bot size={72} strokeWidth={1.5} />
          </div>
        </div>
      );
  }
};

export const ProjectRequiredEmptyState: React.FC<ProjectRequiredEmptyStateProps> = ({
  type = 'dashboard',
  message = "Please select a project to continue."
}) => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleSelectProject = () => {
    window.dispatchEvent(new Event('open-project-switcher'));
  };

  return (
    <div className={styles.emptyStateContainer} aria-live="polite">
      <div className={styles.emptyStateBox}>
        <div className={styles.illustrationWrapper} aria-hidden="true">
          <div className={`${styles.glowBackground} ${isReducedMotion ? styles.noAnimation : ''}`} />
          
          <div className={`${styles.mainCharacter} ${isReducedMotion ? styles.noAnimation : ''}`}>
            <CharacterIllustration type={type} />
          </div>
          
          <div className={`${styles.sparkle} ${styles.sparkle1} ${isReducedMotion ? styles.noAnimation : ''}`}>
            <Sparkles size={16} />
          </div>
          <div className={`${styles.sparkle} ${styles.sparkle2} ${isReducedMotion ? styles.noAnimation : ''}`}>
            <Sparkles size={12} />
          </div>
          <div className={`${styles.sparkle} ${styles.sparkle3} ${isReducedMotion ? styles.noAnimation : ''}`}>
            <Sparkles size={20} />
          </div>
        </div>

        <h2 className={styles.emptyStateTitle}>Please select a project</h2>
        <p className={styles.emptyStateDesc}>{message}</p>
        
        <Button 
          onClick={handleSelectProject} 
          className={styles.selectButtonGold}
        >
          Select Project
        </Button>
      </div>
    </div>
  );
};
