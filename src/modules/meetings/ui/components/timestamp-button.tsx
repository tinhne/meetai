"use client";

import { useTranslations } from "next-intl";

import { formatTimestamp } from "@/lib/utils";
import { useMeetingPlayer } from "./meeting-player";

// A clickable [m:ss] that jumps the recording (plain text without one).
export const TimestampButton = ({ ms }: { ms: number }) => {
  const t = useTranslations("notes");
  const player = useMeetingPlayer();
  const label = formatTimestamp(ms);

  if (!player?.hasMedia) {
    return <span className="font-mono text-xs text-muted-foreground">[{label}]</span>;
  }

  return (
    <button
      type="button"
      onClick={() => player.seek(ms)}
      aria-label={t("jumpTo", { time: label })}
      className="rounded px-1 font-mono text-xs text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      [{label}]
    </button>
  );
};
