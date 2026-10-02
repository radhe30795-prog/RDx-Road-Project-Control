import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { trpc } from "../lib/trpc";

export interface ProjectOption {
  id: number;
  projectName: string;
  projectId: string;
  package?: string | null;
  clientDepartment?: string | null;
  contractor?: string | null;
  agreementStartDate?: string | null;
  agreementEndDate?: string | null;
  status?: string | null;
  overallProgress?: string | null;
  remarks?: string | null;
}

interface ProjectContextType {
  projectId: number | undefined;
  setProjectId: (id: number) => void;
  projects: ProjectOption[] | undefined;
  isLoading: boolean;
  activeProject: ProjectOption | undefined;
}

const ProjectContext = createContext<ProjectContextType>({
  projectId: undefined,
  setProjectId: () => {},
  projects: undefined,
  isLoading: true,
  activeProject: undefined,
});

export const PROJECT_STORAGE_KEY = "rdx-active-project";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [projectId, setProjectIdState] = useState<number | undefined>(() => {
    try {
      const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
      return saved ? parseInt(saved) : undefined;
    } catch {
      return undefined;
    }
  });

  // Default to first project once loaded; repair stale saved ids
  useEffect(() => {
    if (!isLoading && projects && projects.length > 0) {
      const saved = (() => {
        try { return localStorage.getItem(PROJECT_STORAGE_KEY); } catch { return null; }
      })();
      const savedId = saved ? parseInt(saved) : NaN;
      const valid = !isNaN(savedId) && projects.some((p: any) => p.id === savedId);
      if (!valid) {
        const firstId = (projects[0] as any).id;
        setProjectIdState(firstId);
        try { localStorage.setItem(PROJECT_STORAGE_KEY, String(firstId)); } catch {}
      } else if (projectId === undefined) {
        setProjectIdState(savedId);
      }
    }
  }, [isLoading, projects]);

  const setProjectId = useCallback((id: number) => {
    setProjectIdState(id);
    try { localStorage.setItem(PROJECT_STORAGE_KEY, String(id)); } catch {}
  }, []);

  const activeProject = projects?.find((p: any) => p.id === projectId) as ProjectOption | undefined;

  return (
    <ProjectContext.Provider value={{ projectId, setProjectId, projects: projects as any, isLoading, activeProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useActiveProject() {
  return useContext(ProjectContext);
}
