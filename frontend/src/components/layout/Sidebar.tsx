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
import logo from '../../assets/scrum master logo.png';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { setSidebarOpen } = useUIStore();
  
  const mainNav = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Projects', to: '/projects', icon: FolderKanban },
    { name: 'Analytics', to: '/analytics', icon: LineChart, disabled: true },
    { name: 'Errors', to: '/errors', icon: AlertCircle },
    { name: 'API Health', to: '/api-health', icon: Activity },
    { name: 'Performance', to: '/performance', icon: Zap, disabled: true },
    { name: 'Feedback', to: '/feedback', icon: MessageSquare, disabled: true },
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
            <span>{item.name}</span>
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
