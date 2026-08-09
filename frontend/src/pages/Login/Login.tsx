import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import styles from './Login.module.css';
import logo from '../../assets/scrum master logo.png';

export const Login: React.FC = () => {
  const { isAuthenticated, login, isLoading } = useAuthStore();
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential) {
      setError('Credential is required for testing phase');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    try {
      // In a real app, this credential would come from Google Identity Services button
      // For Phase 1 testing when Google auth might not be configured, 
      // we'll pass whatever they type. If backend Google auth is enforced, this will fail
      // unless it's a real Google ID token.
      await login(credential);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Google OAuth may not be configured.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard}>
        <CardHeader className={styles.header}>
          <div className={styles.logo}>
            <img src={logo} alt="Scrum Master" className={styles.logoImage} />
          </div>
          <CardTitle>Welcome back</CardTitle>
          <p className={styles.subtitle}>Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}
            
            <div className={styles.infoAlert}>
              <p>For Phase 1 Testing:</p>
              <p>If Google Auth is configured, paste your Google ID token below.</p>
              <p>Otherwise, authentication will fail.</p>
            </div>
            
            <Input 
              label="Google ID Token (Test)" 
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="eyJhbGciOiJSUzI1..."
            />
            
            <Button 
              type="submit" 
              fullWidth 
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
