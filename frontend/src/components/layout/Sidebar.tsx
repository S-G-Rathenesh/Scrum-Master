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
import { useProjectStore } from '../../stores/projectStore';
import logo from '../../assets/scrum master logo.png';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { setSidebarOpen } = useUIStore();
  const { unreadCount, fetchUnreadCount } = useFeedbackStore();
  const { currentProject } = useProjectStore();

  React.useEffect(() => {
    if (currentProject) {
      fetchUnreadCount(currentProject.id);
    }
  }, [currentProject, fetchUnreadCount]);
  
  const mainNav = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Projects', to: '/projects', icon: FolderKanban },
    { name: 'Analytics', to: '/analytics', icon: LineChart },
    { name: 'Errors', to: '/errors', icon: AlertCircle },
    { name: 'API Health', to: '/api-health', icon: Activity },
    { name: 'Performance', to: '/performance', icon: Zap, disabled: true },
    { name: 'Feedback', to: '/feedback', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { name: 'Notifications', to: '/notifications', icon: Bell, disabled: true },
  ];

  const setupNav = [
    { name: 'Setup Scrum Master', to: '/setup', icon: Plug },
  ];

  const settingsNav = [
    { name: 'Members', to: '/members', icon: Users },
    { name: 'Settings', to: '/settings', icon: Settings },
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
            <item.icon className={styles.navIcon} size={18} />
            <span style={{ flex: 1 }}>{item.name}</span>
            {item.badge && (
              <span style={{ 
                background: 'var(--primary-color)', 
                color: 'white', 
                fontSize: '0.75rem', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '10px',
                fontWeight: 'bold'
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
        {renderNavItems(mainNav)}
        
        <hr className={styles.separator} />
        
        {renderNavItems(setupNav)}
        
        <hr className={styles.separator} />
        
        {renderNavItems(settingsNav)}
      </nav>
    </aside>
  );
};
