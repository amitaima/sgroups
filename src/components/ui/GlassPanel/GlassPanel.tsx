import type { GlassPanelProps } from "./GlassPanel.types";
import "./GlassPanel.scss";

export const GlassPanel = ({
  intensity = "soft",
  className = "",
  ...props
}: GlassPanelProps) => {
  const classNames = [
    "glass-panel",
    intensity === "strong" ? "glass-panel--strong" : "glass-panel--soft",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classNames} {...props} />;
};
