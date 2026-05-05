import { useEffect, useState } from "react";
import { useAuth } from "@app/providers/AuthProvider";
import type { Project } from "../types/common";
import { getProjectById } from "@services/firebase/firebase";

interface UseWorkspaceProjectResult {
  project: Project | null;
  loading: boolean;
  error: string | null;
}

export const useWorkspaceProject = (
  projectId?: string,
): UseWorkspaceProjectResult => {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!projectId || !user) {
      setProject(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    void getProjectById(projectId)
      .then((nextProject) => {
        if (!active) {
          return;
        }

        if (!nextProject || !nextProject.memberIds.includes(user.uid)) {
          setProject(null);
          return;
        }

        setProject(nextProject);
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }

        console.error("Failed to load workspace project", nextError);
        setError("לא הצלחנו לטעון את הפרויקט.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, user]);

  return { project, loading, error };
};
