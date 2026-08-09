import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/common/Button';
import styles from './Landing.module.css';
import logo from '../../assets/scrum master logo.png';

export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src={logo} alt="Scrum Master" className={styles.logoImage} />
          <span className={styles.logoText}>Scrum Master</span>
        </div>
        <div className={styles.nav}>
          <Button variant="outline" onClick={() => navigate('/login')}>Login</Button>
          <Button onClick={() => navigate('/login')}>Sign Up</Button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.heroTitle}>
          Centralized Monitoring for Your Existing Projects
        </h1>
        <p className={styles.heroSubtitle}>
          Connect your application in minutes. Track uptime, errors, performance, and user feedback all in one beautiful dashboard. No rebuild required.
        </p>
        <div className={styles.cta}>
          <Button size="lg" onClick={() => navigate('/login')}>Get Started for Free</Button>
        </div>
      </main>
    </div>
  );
};
