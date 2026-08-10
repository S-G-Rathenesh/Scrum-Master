import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layout
import { MainLayout } from './components/layout/MainLayout';

// Pages
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Projects } from './pages/Projects/Projects';
import { Setup } from './pages/Setup/Setup';
import { Settings } from './pages/Settings/Settings';
import { ApiHealth } from './pages/ApiHealth/ApiHealth';
import { ErrorCenter } from './pages/ErrorCenter/ErrorCenter';
import { ErrorDetail } from './pages/ErrorCenter/ErrorDetail';
import { FeedbackHub } from './pages/FeedbackHub/FeedbackHub';
import { FeedbackDetail } from './pages/FeedbackHub/FeedbackDetail';
import { Analytics } from './pages/Analytics/Analytics';
import { Notifications } from './pages/Notifications/Notifications';

import { Members } from './pages/Members/Members';
import { Landing } from './pages/Landing/Landing';
import { Signup } from './pages/Signup/Signup';

const PlaceholderPage = ({ title }: { title: string }) => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>{title}</h2>
    <p>This feature will be implemented in a later phase.</p>
  </div>
);

function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading Scrum Master...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="setup" element={<Setup />} />
          <Route path="analytics" element={<Analytics />} />
          
          {/* Placeholders for future phases */}
          <Route path="errors" element={<ErrorCenter />} />
          <Route path="errors/:id" element={<ErrorDetail />} />
          <Route path="feedback" element={<FeedbackHub />} />
          <Route path="feedback/:id" element={<FeedbackDetail />} />
          <Route path="api-health" element={<ApiHealth />} />
          <Route path="performance" element={<PlaceholderPage title="Performance Monitoring" />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="members" element={<Members />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
