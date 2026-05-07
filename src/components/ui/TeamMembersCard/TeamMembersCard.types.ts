import type { ReactNode } from "react";

export interface TeamMember {
  name: string;
  role: string;
}

export interface TeamMembersCardProps {
  members: TeamMember[];
  actions?: ReactNode;
}
