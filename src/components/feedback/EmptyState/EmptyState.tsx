import type { EmptyStateProps } from "./EmptyState.types";
import "./EmptyState.scss";

export const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <div className="empty-state">
      <h3 className="empty-state__title">{title}</h3>
      {description ? (
        <p className="empty-state__description">{description}</p>
      ) : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
};
