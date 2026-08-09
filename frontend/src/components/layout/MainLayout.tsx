import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './MainLayout.module.css';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { clsx } from 'clsx';

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  if (!isAuthenticated) {
    return (
      <div className={styles.unauthenticated}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar className={clsx(styles.sidebar, isSidebarOpen && styles.sidebarOpen)} />
      <div className={styles.mainWrapper}>
        <Topbar />
        <main className={styles.mainContent}>
          <div className={styles.contentContainer}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
