import type { HTMLAttributes } from "react";
import "./PageSection.scss";

interface PageSectionProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "main";
}

export const PageSection = ({
  as: Component = "section",
  className = "",
  ...props
}: PageSectionProps) => {
  const classNames = ["page-section", className].filter(Boolean).join(" ");
  return <Component className={classNames} {...props} />;
};
