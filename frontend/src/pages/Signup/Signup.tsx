import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/common/Card';
import styles from './Signup.module.css';
import logo from '../../assets/scrum master logo.png';

export const Signup: React.FC = () => {
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
                console.error('[Scrum Master Signup Error]:', err.response?.data || err.message || err);
                const status = err.response?.status;
                if (status === 500) {
                  setError('Unable to create your account right now. Please try again later.');
                } else if (status === 401 || status === 400) {
                  setError('Authentication failed. Invalid Google credentials.');
                } else {
                  setError('Unable to complete registration. Please try again.');
                }
              } finally {
                setIsSubmitting(false);
              }
            }
          },
        });

        googleBtnRef.current.innerHTML = '';

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: 320,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogleOAuth();
    } else {
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
        <Link to="/" style={{ alignSelf: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          &larr; Back to Home
        </Link>
        <div className={styles.brandHeader}>
          <img src={logo} alt="Scrum Master Logo" className={styles.logo} />
          <h1 className={styles.brandTitle}>SCRUM MASTER</h1>
        </div>

        <Card className={styles.signupCard}>
          <CardContent className={styles.cardContent}>
            <div className={styles.headerGroup}>
              <h2 className={styles.title}>Create your account</h2>
              <p className={styles.subtitle}>
                Get started with centralized monitoring for your applications in seconds.
              </p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <div className={styles.oauthContainer}>
              <div ref={googleBtnRef} className={styles.googleButtonWrapper}></div>
              {isSubmitting && <div className={styles.loadingText}>Creating your account with Google...</div>}
            </div>

            <div className={styles.footerNote}>
              Already have an account?{' '}
              <Link to="/login" className={styles.link}>
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
