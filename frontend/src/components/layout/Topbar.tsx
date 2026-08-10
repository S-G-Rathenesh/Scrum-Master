import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, Menu } from 'lucide-react';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useNotificationStore } from '../../stores/notificationStore';
import styles from './Topbar.module.css';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <ProjectSwitcher />
      </div>

      <div className={styles.right}>
        <button 
          className={styles.iconBtn} 
          onClick={() => navigate('/notifications')}
          title="Notifications"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className={styles.badge} style={{ width: 'auto', minWidth: '18px', height: '18px', padding: '0 4px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', background: 'var(--color-primary)', color: '#080A0F' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        
        <div className={styles.profileContainer}>
          <button 
            className={styles.profileBtn}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                <User size={16} />
              </div>
            )}
          </button>
          
          {showProfileMenu && (
            <div className={styles.profileMenu}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.name || 'User'}</span>
                <span className={styles.userEmail}>{user?.email}</span>
              </div>
              <hr className={styles.divider} />
              <button className={styles.menuItem}>Profile Settings</button>
              <button 
                className={styles.menuItem}
                onClick={() => {
                  logout();
                  setShowProfileMenu(false);
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
