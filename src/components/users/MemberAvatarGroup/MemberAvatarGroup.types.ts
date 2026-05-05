export interface MemberAvatarItem {
  id: string;
  displayName?: string | null;
  photoURL?: string | null;
  email?: string | null;
}

export interface MemberAvatarGroupProps {
  members: MemberAvatarItem[];
  maxVisible?: number;
  size?: "sm" | "md";
  className?: string;
}
