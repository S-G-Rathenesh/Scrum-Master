import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useNavigate } from 'react-router-dom';
import styles from './ProjectSwitcher.module.css';

export const ProjectSwitcher: React.FC = () => {
  const { projects, currentProject, selectProjectById, setCurrentProject } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleOpenSwitcher = () => {
      setIsOpen(true);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('open-project-switcher', handleOpenSwitcher);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('open-project-switcher', handleOpenSwitcher);
    };
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string, intStatus: string) => {
    if (status === 'INACTIVE') return '🔴';
    if (intStatus === 'CONNECTED') return '🟢';
    if (intStatus === 'WAITING') return '🟡';
    return '⚪';
  };

  return (
    <>
      <div className={styles.container} ref={dropdownRef}>
        <button className={styles.button} onClick={() => setIsOpen(!isOpen)}>
          {currentProject ? (
            <>
              <span className={styles.projectIcon}>
                {getStatusColor(currentProject.status, currentProject.integrationStatus)}
              </span>
              <span className={styles.projectName}>
                {currentProject.name}
                {currentProject.integrationStatus === 'WAITING' && (
                  <span style={{ opacity: 0.7, fontSize: '0.85em', marginLeft: '6px' }}>• Waiting</span>
                )}
              </span>
            </>
          ) : (
            <span className={styles.projectName}>Select Project</span>
          )}
          <ChevronDown size={16} className={styles.chevron} />
        </button>

        {isOpen && (
          <div className={styles.dropdown}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                autoFocus
              />
            </div>

            <div className={styles.projectList}>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    className={styles.projectItem}
                    onClick={() => {
                      selectProjectById(project.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className={styles.projectIcon}>
                      {getStatusColor(project.status, project.integrationStatus)}
                    </span>
                    <span className={styles.projectItemName}>
                      {project.name}
                      {project.integrationStatus === 'WAITING' && (
                        <span style={{ opacity: 0.7, fontSize: '0.85em', marginLeft: '6px' }}>• Waiting</span>
                      )}
                    </span>
                    {currentProject?.id === project.id && (
                      <Check size={16} className={styles.checkIcon} />
                    )}
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>No projects found</div>
              )}
            </div>

            <div className={styles.footer}>
              <button 
                className={styles.addBtn}
                onClick={() => {
                  setIsOpen(false);
                  setCurrentProject(null);
                  navigate('/setup');
                }}
              >
                <Plus size={16} />
                <span>Add Project</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
