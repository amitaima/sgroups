export const PROJECTS_ROOT_PATH = "/projects";

export const WORKSPACE_SECTIONS = [
  "dashboard",
  "tasks",
  "calendar",
  "settings",
] as const;

export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

export interface WorkspaceNavItemConfig {
  id: WorkspaceSection;
  label: string;
  section: WorkspaceSection;
}

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItemConfig[] = [
  { id: "dashboard", label: "מסך ניהול", section: "dashboard" },
  { id: "tasks", label: "משימות", section: "tasks" },
  { id: "calendar", label: "יומן", section: "calendar" },
  { id: "settings", label: "הגדרות פרוייקט", section: "settings" },
];

export const getProjectsRootPath = () => PROJECTS_ROOT_PATH;

export const getProjectWorkspacePath = (
  projectId: string,
  section: WorkspaceSection = "dashboard",
) => `${PROJECTS_ROOT_PATH}/${projectId}/${section}`;

export const getProjectWorkspaceDashboardPath = (projectId: string) =>
  getProjectWorkspacePath(projectId, "dashboard");
