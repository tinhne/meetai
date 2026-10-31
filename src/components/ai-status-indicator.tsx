"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type AIStatus = "idle" | "listening" | "thinking" | "speaking" | "off";

interface Props {
  status: AIStatus;
  className?: string;
  showLabel?: boolean;
}

const BAR_DELAYS = ["0ms", "120ms", "240ms", "360ms"];

// Small waveform that reflects what the AI agent is doing in a call.
export const AIStatusIndicator = ({
  status,
  className,
  showLabel = true,
}: Props) => {
  const t = useTranslations("aiStatus");
  const isActive = status === "speaking" || status === "listening";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-ai/30 bg-ai/10 px-3 py-1 text-xs font-medium text-ai",
        status === "off" && "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
        {BAR_DELAYS.map((delay, index) => (
          <span
            key={delay}
            className={cn(
              "w-0.5 rounded-full bg-current",
              isActive ? "animate-pulse" : "",
              status === "thinking" && "animate-bounce",
            )}
            style={{
              height: isActive ? `${[60, 100, 70, 90][index]}%` : "35%",
              animationDelay: delay,
              animationDuration: status === "speaking" ? "600ms" : "1200ms",
            }}
          />
        ))}
      </span>
      {showLabel && <span>{t(status)}</span>}
    </div>
  );
};
