import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './MainLayout.module.css';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { clsx } from 'clsx';
import { useProjectStore } from '../../stores/projectStore';

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { fetchProjects } = useProjectStore();
  const location = useLocation();

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
