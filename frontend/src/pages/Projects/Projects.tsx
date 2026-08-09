import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { Button } from '../../components/common/Button';
import { Card, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Plus, Search, FolderKanban } from 'lucide-react';
import styles from './Projects.module.css';

export const Projects: React.FC = () => {
  const { projects, fetchProjects, isLoading, selectProjectById } = useProjectStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>Manage your monitored applications</p>
        </div>
        <Button onClick={() => navigate('/setup?new=true')}>
          <Plus size={16} className={styles.btnIcon} style={{ marginRight: '0.5rem' }} />
          Add Project
        </Button>
      </header>

      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.projectList}>
        {isLoading ? (
          <div className={styles.emptyState}>Loading projects...</div>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <Card key={project.id} className={styles.projectCard}>
              <CardContent className={styles.projectCardContent}>
                <div className={styles.projectHeader}>
                  <div className={styles.projectInfo}>
                    <FolderKanban size={20} className={styles.projectIcon} />
                    <h3 className={styles.projectName}>{project.name}</h3>
                  </div>
                  <div className={styles.projectBadges}>
                    <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>
                      {project.status}
                    </Badge>
                    <Badge variant={project.integrationStatus === 'CONNECTED' ? 'success' : 'warning'}>
                      {project.integrationStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                {project.description && (
                  <p className={styles.projectDesc}>{project.description}</p>
                )}
                <div className={styles.projectFooter}>
                  <span className={styles.metaText}>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => {
                    selectProjectById(project.id);
                    if (project.integrationStatus !== 'CONNECTED') {
                      navigate('/setup');
                    } else {
                      navigate('/');
                    }
                  }}>
                    Select Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className={styles.emptyState}>
            No projects found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
};
