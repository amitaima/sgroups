import type { Project } from "../../../types/common";
import type { MemberAvatarItem } from "@components/users/MemberAvatarGroup";

export interface ProjectCardProps {
  project: Project;
  members: MemberAvatarItem[];
  creatorLabel: string;
  onEnter: () => void;
}
