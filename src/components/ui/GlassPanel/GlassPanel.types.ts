import type { HTMLAttributes } from "react";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: "soft" | "strong";
}
