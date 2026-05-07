import type { ButtonHTMLAttributes } from "react";
import type { ButtonSize, ButtonVariant } from "./Button.types";
import "./Button.scss";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "button--sm",
  md: "button--md",
  lg: "button--lg",
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "button--primary",
  secondary: "button--secondary",
};

export const Button = ({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) => {
  const classNames = [
    "button",
    variantClassMap[variant],
    sizeClassMap[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classNames} {...props} />;
};
