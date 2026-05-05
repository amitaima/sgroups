import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { TeamMembersCardProps } from "./TeamMembersCard.types";
import "./TeamMembersCard.scss";

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`
    : (parts[0]?.slice(0, 2) ?? "");
};

export const TeamMembersCard = ({ members }: TeamMembersCardProps) => {
  return (
    <GlassPanel className="team-card">
      <div className="team-card__header">
        <div>
          <p className="team-card__eyebrow">Team</p>
          <h3 className="team-card__title">חברי צוות</h3>
        </div>
        <span className="team-card__count">{members.length} חברים</span>
      </div>
      <div className="team-card__list">
        {members.map((member) => (
          <div key={member.name} className="team-card__member">
            <div className="team-card__avatar">{getInitials(member.name)}</div>
            <div className="team-card__meta">
              <p className="team-card__name">{member.name}</p>
              <p className="team-card__role">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
