import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "ai";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/10 text-info border-info/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  ai: "bg-ai/10 text-ai border-ai/20",
};

interface Props {
  tone: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const StatusBadge = ({ tone, icon, children, className }: Props) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize [&_svg]:size-3.5",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
};
