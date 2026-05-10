export interface ProfileMenuButtonProps {
  userLabel: string;
  userPhoto?: string;
  onOpenSettings: () => void;
  onSignOut: () => Promise<void> | void;
  className?: string;
}
