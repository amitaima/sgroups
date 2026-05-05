import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { TeamLinksCardProps } from "./TeamLinksCard.types";
import "./TeamLinksCard.scss";

export const TeamLinksCard = ({ links }: TeamLinksCardProps) => {
  return (
    <GlassPanel className="links-card">
      <div className="links-card__header">
        <div>
          <p className="links-card__eyebrow">Resources</p>
          <h3 className="links-card__title">קישורי צוות</h3>
        </div>
      </div>
      <div className="links-card__list">
        {links.map((link) => (
          <a key={link.label} className="links-card__item" href={link.href}>
            <span className="links-card__item-label">{link.label}</span>
            <span className="links-card__item-arrow">↗</span>
          </a>
        ))}
      </div>
    </GlassPanel>
  );
};
