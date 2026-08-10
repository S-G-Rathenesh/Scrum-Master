import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  LineChart, 
  AlertCircle, 
  Activity, 
  Zap, 
  MessageSquare, 
  Bell, 
  Plug, 
  Users, 
  Settings 
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useUIStore } from '../../stores/uiStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useProjectStore } from '../../stores/projectStore';
import logo from '../../assets/scrum master logo.png';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { setSidebarOpen } = useUIStore();
  const { unreadCount, fetchUnreadCount } = useFeedbackStore();
  const { unreadCount: notifUnreadCount, fetchUnreadCount: fetchNotifUnreadCount } = useNotificationStore();
  const { currentProject } = useProjectStore();

  React.useEffect(() => {
    if (currentProject) {
      fetchUnreadCount(currentProject.id);
      fetchNotifUnreadCount(currentProject.id);
    }
  }, [currentProject, fetchUnreadCount, fetchNotifUnreadCount]);
  
  const mainNav = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, channel: '01' },
    { name: 'Projects', to: '/projects', icon: FolderKanban, channel: '02' },
    { name: 'Analytics', to: '/analytics', icon: LineChart, channel: '03' },
    { name: 'Errors', to: '/errors', icon: AlertCircle, channel: '04' },
    { name: 'API Health', to: '/api-health', icon: Activity, channel: '05' },
    { name: 'Performance', to: '/performance', icon: Zap, disabled: true, channel: '06' },
    { name: 'Feedback', to: '/feedback', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined, channel: '07' },
    { name: 'Notifications', to: '/notifications', icon: Bell, badge: notifUnreadCount > 0 ? notifUnreadCount : undefined, channel: '08' },
  ];

  const setupNav = [
    { name: 'Setup Scrum Master', to: '/setup', icon: Plug, channel: '09' },
  ];

  const settingsNav = [
    { name: 'Members', to: '/members', icon: Users, channel: '10' },
    { name: 'Settings', to: '/settings', icon: Settings, channel: '11' },
  ];

  const renderNavItems = (items: typeof mainNav) => (
    <ul className={styles.navList}>
      {items.map((item) => (
        <li key={item.name}>
          <NavLink
            to={item.to}
            className={({ isActive }) => 
              twMerge(clsx(styles.navItem, isActive && !item.disabled && styles.active, item.disabled && styles.disabled))
            }
            onClick={(e) => {
              if (item.disabled) {
                e.preventDefault();
              } else {
                setSidebarOpen(false);
              }
            }}
          >
            <item.icon className={styles.navIcon} size={16} />
            <span style={{ flex: 1 }}>{item.name}</span>
            {item.badge && (
              <span style={{ 
                background: 'var(--color-primary)', 
                color: '#080A0F', 
                fontSize: '0.7rem', 
                padding: '0.05rem 0.35rem', 
                borderRadius: '4px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-mono)'
              }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <aside className={twMerge(clsx(styles.sidebar, className))}>
      <div className={styles.logo}>
        <img src={logo} alt="Scrum Master" className={styles.logoImage} />
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>CHANNELS</div>
        {renderNavItems(mainNav)}
        
        <hr className={styles.separator} />
        
        <div className={styles.sectionLabel}>INTEGRATION</div>
        {renderNavItems(setupNav)}
        
        <hr className={styles.separator} />
        
        <div className={styles.sectionLabel}>WORKSPACE</div>
        {renderNavItems(settingsNav)}
      </nav>
    </aside>
  );
};
