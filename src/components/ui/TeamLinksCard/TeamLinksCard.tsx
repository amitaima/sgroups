import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { TeamLinksCardProps } from "./TeamLinksCard.types";
import "./TeamLinksCard.scss";

export const TeamLinksCard = ({ links }: TeamLinksCardProps) => {
  return (
    <GlassPanel className="links-card">
      <h3 className="links-card__title">קישורי צוות</h3>
      <div className="links-card__list">
        {links.map((link) => (
          <a key={link.label} className="links-card__item" href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </GlassPanel>
  );
};
