export interface DashboardHeaderProps {
  onOpenMenu: () => void;
  isMenuOpen?: boolean;
  currentProjectId?: string;
  userLabel: string;
  userId: string;
  userPhoto?: string;
  onOpenSettings: () => void;
  onSignOut: () => Promise<void>;
}
