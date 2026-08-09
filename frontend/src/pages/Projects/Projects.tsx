import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { projectService } from '../../services/projects';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Plus, Search, FolderKanban } from 'lucide-react';
import styles from './Projects.module.css';

export const Projects: React.FC = () => {
  const { projects, fetchProjects, isLoading, selectProjectById } = useProjectStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = searchParams.get('new') === 'true';
  
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(isNew);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) return;
    
    setIsSubmitting(true);
    try {
      const created = await projectService.createProject(newProject);
      await fetchProjects();
      selectProjectById(created.id);
      setShowCreate(false);
      setNewProject({ name: '', description: '' });
      if (isNew) setSearchParams({});
    } catch (error) {
      console.error('Failed to create project', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} className={styles.btnIcon} />
          Add Project
        </Button>
      </header>

      {showCreate && (
        <Card className={styles.createCard}>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className={styles.createForm}>
              <Input
                label="Project Name"
                placeholder="e.g. My Awesome SaaS"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                required
              />
              <Input
                label="Description (Optional)"
                placeholder="What does this project do?"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
              <div className={styles.formActions}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreate(false);
                    if (isNew) setSearchParams({});
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !newProject.name}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                  <Button variant="outline" size="sm" onClick={() => selectProjectById(project.id)}>
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
