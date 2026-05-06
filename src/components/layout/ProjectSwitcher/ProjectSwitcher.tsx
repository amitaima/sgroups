import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@app/providers/AuthProvider";
import { getUserProjects } from "@services/firebase/firebase";
import type { Project } from "../../../types/common";
import { ArrowRightLeft, ChevronDown, FolderKanban } from "lucide-react";
import type { ProjectSwitcherProps } from "./ProjectSwitcher.types";
import "./ProjectSwitcher.scss";

export const ProjectSwitcher = ({ currentProjectId }: ProjectSwitcherProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    if (!user) {
      setProjects([]);
      return;
    }

    setLoading(true);
    void getUserProjects(user.uid)
      .then((nextProjects) => {
        if (active) {
          setProjects(nextProjects);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectedProject = useMemo(() => {
    if (!currentProjectId) {
      return null;
    }

    return projects.find((project) => project.id === currentProjectId) ?? null;
  }, [currentProjectId, projects]);

  const label = selectedProject?.name ?? "הפרויקטים שלי";

  return (
    <div className="project-switcher" ref={containerRef}>
      <button
        className="project-switcher__button"
        type="button"
        onClick={() => setOpen((nextOpen) => !nextOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading}
      >
        <FolderKanban size={16} />
        <span className="project-switcher__label">{label}</span>
        <ChevronDown size={16} className="project-switcher__chevron" />
      </button>

      {open ? (
        <div
          className="project-switcher__menu"
          role="listbox"
          aria-label="החלף פרויקט"
        >
          {projects.length === 0 ? (
            <div className="project-switcher__empty">אין פרויקטים זמינים</div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`project-switcher__option${
                  project.id === currentProjectId ? " is-active" : ""
                }`}
                onClick={() => {
                  setOpen(false);
                  navigate(`/projects/${project.id}/dashboard`);
                }}
              >
                <ArrowRightLeft size={14} />
                <span className="project-switcher__option-name">
                  {project.name}
                </span>
                {/* {project.description ? (
                  <span className="project-switcher__option-description">
                    {project.description}
                  </span>
                ) : null} */}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
