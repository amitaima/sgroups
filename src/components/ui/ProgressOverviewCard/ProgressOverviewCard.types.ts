import type { ReactNode } from "react";

export interface ProgressOverviewCardProps {
  progress: number;
  title?: string;
  subtitle?: string;
  hint?: string;
  badgeLabel?: string;
  actions?: ReactNode;
}