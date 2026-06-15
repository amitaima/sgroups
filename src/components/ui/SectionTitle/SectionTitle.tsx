import type { SectionTitleProps } from "./SectionTitle.types";
import "./SectionTitle.scss";

export const SectionTitle = ({
  title,
  subtitle,
  actions,
}: SectionTitleProps) => {
  return (
    <div className="section-title">
      <div>
        <h2 className="section-title__heading">{title}</h2>
      </div>
      {actions ? <div className="section-title__actions">{actions}</div> : null}
    </div>
  );
};
