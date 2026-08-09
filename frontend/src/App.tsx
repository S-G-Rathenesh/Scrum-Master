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
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="setup" element={<Setup />} />
          
          {/* Placeholders for future phases */}
          <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
          <Route path="errors" element={<PlaceholderPage title="Errors" />} />
          <Route path="api-health" element={<ApiHealth />} />
          <Route path="performance" element={<PlaceholderPage title="Performance Monitoring" />} />
          <Route path="feedback" element={<PlaceholderPage title="Feedback" />} />
          <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
          <Route path="members" element={<PlaceholderPage title="Members" />} />
          <Route path="settings" element={<Settings />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
