import type { ReactNode } from "react";

export interface TeamLink {
  label: string;
  href: string;
}

export interface TeamLinksCardProps {
  links: TeamLink[];
  actions?: ReactNode;
}
