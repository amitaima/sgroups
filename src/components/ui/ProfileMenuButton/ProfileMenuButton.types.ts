export interface ProfileMenuButtonProps {
  userLabel: string;
  userPhoto?: string;
  onSignOut: () => Promise<void> | void;
  className?: string;
}
