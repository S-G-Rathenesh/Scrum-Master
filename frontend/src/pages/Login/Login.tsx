import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/common/Card';
import styles from './Login.module.css';
import logo from '../../assets/scrum master logo.png';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuthStore();
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (isAuthenticated) return;

    const initializeGoogleOAuth = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              setIsSubmitting(true);
              setError('');
              try {
                await login(response.credential);
              } catch (err: any) {
                console.error('[Scrum Master Login Error]:', err.response?.data || err.message || err);
                const status = err.response?.status;
                if (status === 500) {
                  setError('Unable to sign in right now. Please try again later.');
                } else if (status === 401 || status === 400) {
                  setError('Authentication failed. Invalid Google credentials.');
                } else {
                  setError('Unable to sign in. Please try again.');
                }
              } finally {
                setIsSubmitting(false);
              }
            }
          },
        });

        // Clear previous button content if any
        googleBtnRef.current.innerHTML = '';

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: 320,
        });
      }
    };

    // If script is already loaded
    if (window.google?.accounts?.id) {
      initializeGoogleOAuth();
    } else {
      // Poll briefly for GIS script load
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initializeGoogleOAuth();
        }
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, clientId, login]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.authWrapper}>
        <div className={styles.brandHeader}>
          <img src={logo} alt="Scrum Master Logo" className={styles.logo} />
          <h1 className={styles.brandTitle}>SCRUM MASTER</h1>
        </div>

        <Card className={styles.loginCard}>
          <CardContent className={styles.cardContent}>
            <div className={styles.headerGroup}>
              <h2 className={styles.title}>Welcome back</h2>
              <p className={styles.subtitle}>
                Sign in to monitor and understand your applications in real-time.
              </p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <div className={styles.oauthContainer}>
              <div ref={googleBtnRef} className={styles.googleButtonWrapper}></div>
              {isSubmitting && <div className={styles.loadingText}>Authenticating with Google...</div>}
            </div>

            <div className={styles.footerNote}>
              Don't have an account?{' '}
              <Link to="/signup" className={styles.link}>
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
