import type { ReactNode } from "react";

export interface TeamMember {
  name: string;
  role: string;
  photoURL?: string | null; 
}
export interface TeamMembersCardProps {
  members: TeamMember[];
  actions?: ReactNode;
}
