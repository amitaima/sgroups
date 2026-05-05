import type {
  MemberAvatarGroupProps,
  MemberAvatarItem,
} from "./MemberAvatarGroup.types";
import "./MemberAvatarGroup.scss";

const getMemberInitial = (member: MemberAvatarItem) => {
  const label = member.displayName || member.email || member.id;
  return label.trim().charAt(0).toUpperCase() || "?";
};

export const MemberAvatarGroup = ({
  members,
  maxVisible = 4,
  size = "md",
  className = "",
}: MemberAvatarGroupProps) => {
  const visibleMembers = members.slice(0, maxVisible);
  const overflowCount = Math.max(members.length - maxVisible, 0);

  const classNames = [
    "member-avatar-group",
    size === "sm" ? "member-avatar-group--sm" : "member-avatar-group--md",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} aria-label={`חברי צוות: ${members.length}`}>
      {visibleMembers.map((member, index) => (
        <div
          key={member.id}
          className="member-avatar-group__item"
          style={{ zIndex: visibleMembers.length - index }}
          title={member.displayName || member.email || member.id}
        >
          {member.photoURL ? (
            <img
              className="member-avatar-group__image"
              src={member.photoURL}
              alt={member.displayName || member.email || "חבר צוות"}
            />
          ) : (
            <span className="member-avatar-group__fallback">
              {getMemberInitial(member)}
            </span>
          )}
        </div>
      ))}

      {overflowCount > 0 ? (
        <div className="member-avatar-group__item member-avatar-group__item--more">
          <span className="member-avatar-group__fallback">
            +{overflowCount}
          </span>
        </div>
      ) : null}
    </div>
  );
};
