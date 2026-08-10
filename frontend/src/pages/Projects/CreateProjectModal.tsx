import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { projectService } from '../../services/projects';
import { useProjectStore } from '../../stores/projectStore';
import styles from './CreateProjectModal.module.css';

interface CreateProjectModalProps {
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchProjects, selectProjectById } = useProjectStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newProject = await projectService.createProject({ name: name.trim() });
      await fetchProjects();
      selectProjectById(newProject.id);
      
      onClose();
      navigate('/setup');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add New Project</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="projectName" className={styles.label}>
                Project Name
              </label>
              <input
                id="projectName"
                type="text"
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                placeholder="e.g., Production API, Admin Dashboard"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                autoFocus
                disabled={isSubmitting}
              />
              {error && (
                <div className={styles.errorText}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
