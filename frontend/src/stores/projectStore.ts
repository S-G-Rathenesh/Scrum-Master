import { create } from 'zustand';
import { type Project, projectService } from '../services/projects';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  selectProjectById: (id: string) => void;
  updateCurrentProjectIntegrationStatus: (status: 'WAITING' | 'CONNECTED' | 'DISCONNECTED' | 'REVOKED') => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.getProjects();
      set({ projects, isLoading: false });
      
      const currentId = localStorage.getItem('currentProjectId');
      if (currentId && projects.some(p => p.id === currentId)) {
        // Just rely on the existing ID if valid
        const p = projects.find(p => p.id === currentId);
        set({ currentProject: p });
      } else if (projects.length > 0) {
        get().selectProjectById(projects[0].id);
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch projects', isLoading: false });
    }
  },
  
  setCurrentProject: (project) => {
    const prevProject = get().currentProject;
    if (project?.id === prevProject?.id) return; // Prevent unnecessary clears
    
    if (project) {
      localStorage.setItem('currentProjectId', project.id);
    } else {
      localStorage.removeItem('currentProjectId');
    }
    set({ currentProject: project });
  },
  
  selectProjectById: (id) => {
    const { projects, currentProject } = get();
    if (currentProject?.id === id) return; // Already selected
    
    const project = projects.find(p => p.id === id);
    if (project) {
      localStorage.setItem('currentProjectId', project.id);
      set({ currentProject: project });
    }
  },

  updateCurrentProjectIntegrationStatus: (status) => {
    const { currentProject, projects } = get();
    if (currentProject) {
      const updatedProject = { ...currentProject, integrationStatus: status };
      const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
      set({ currentProject: updatedProject, projects: updatedProjects });
    }
  }
}));
