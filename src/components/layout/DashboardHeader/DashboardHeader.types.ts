export interface DashboardHeaderProps {
  onOpenMenu: () => void;
  currentProjectId?: string;
  userLabel: string;
  userPhoto?: string;
  onSignOut: () => Promise<void>;
}
