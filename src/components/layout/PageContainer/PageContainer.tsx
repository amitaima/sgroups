import type { HTMLAttributes } from "react";
import "./PageContainer.scss";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "md" | "lg";
}

export const PageContainer = ({
  size = "lg",
  className = "",
  ...props
}: PageContainerProps) => {
  const sizeClass = size === "lg" ? "page-container--lg" : "page-container--md";
  const classNames = ["page-container", sizeClass, className]
    .filter(Boolean)
    .join(" ");

  return <div className={classNames} {...props} />;
};
