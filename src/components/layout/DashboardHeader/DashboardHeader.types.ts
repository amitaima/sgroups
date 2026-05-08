export interface DashboardHeaderProps {
  onOpenMenu: () => void;
  isMenuOpen?: boolean;
  currentProjectId?: string;
  userLabel: string;
  userPhoto?: string;
  onSignOut: () => Promise<void>;
}
