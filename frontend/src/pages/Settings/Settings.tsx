import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { monitoringService } from '../../services/monitoring';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const { currentProject, fetchProjects } = useProjectStore();
  const [formData, setFormData] = useState({
    monitoringEnabled: false,
    frontendUrl: '',
    backendUrl: '',
    monitoringInterval: 300,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentProject) {
      setFormData({
        monitoringEnabled: currentProject.monitoringEnabled || false,
        frontendUrl: currentProject.frontendUrl || '',
        backendUrl: currentProject.backendUrl || '',
        monitoringInterval: currentProject.monitoringInterval || 300,
      });
    }
  }, [currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    setIsSubmitting(true);
    setMessage('');
    try {
      await monitoringService.updateSettings(currentProject.id, formData);
      await fetchProjects();
      setMessage('Settings saved successfully.');
    } catch (err: any) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to save settings'}`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!currentProject) {
    return (
      <div className={styles.container}>
        <h2>Settings</h2>
        <p>Please select a project first.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Project Settings</h1>
        <p className={styles.subtitle}>Configure monitoring for {currentProject.name}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Monitoring Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={formData.monitoringEnabled}
                  onChange={(e) => setFormData({ ...formData, monitoringEnabled: e.target.checked })}
                />
                Enable Active Monitoring
              </label>
              <p className={styles.helpText}>When enabled, Scrum Master will actively check your endpoints.</p>
            </div>

            <Input
              label="Frontend URL"
              placeholder="https://scrummaster.rathenesh.dev"
              value={formData.frontendUrl}
              onChange={(e) => setFormData({ ...formData, frontendUrl: e.target.value })}
              disabled={!formData.monitoringEnabled}
            />

            <Input
              label="Backend API URL"
              placeholder="https://api.scrummaster.rathenesh.dev/api/v1/health"
              value={formData.backendUrl}
              onChange={(e) => setFormData({ ...formData, backendUrl: e.target.value })}
              disabled={!formData.monitoringEnabled}
            />

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Check Interval</label>
              <select
                className={styles.select}
                value={formData.monitoringInterval}
                onChange={(e) => setFormData({ ...formData, monitoringInterval: Number(e.target.value) })}
                disabled={!formData.monitoringEnabled}
              >
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={900}>15 minutes</option>
              </select>
            </div>

            <div className={styles.actions}>
              {message && <span className={message.startsWith('Error') ? styles.errorMsg : styles.successMsg}>{message}</span>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Monitoring Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
