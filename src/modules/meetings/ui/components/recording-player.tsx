"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { useMeetingPlayer } from "./meeting-player";

export const RecordingPlayer = ({ meetingId }: { meetingId: string }) => {
  const t = useTranslations("meetingDetail");
  const trpc = useTRPC();
  const player = useMeetingPlayer();
  // Signed URLs are short-lived; refresh before they expire.
  const { data, isPending } = useQuery({
    ...trpc.meetings.getRecordingUrl.queryOptions({ id: meetingId }),
    staleTime: 30 * 60 * 1000,
  });

  const hasUrl = !!data?.url;
  useEffect(() => {
    player?.setHasMedia(hasUrl);
  }, [hasUrl, player]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {isPending ? (
        <Skeleton className="aspect-video w-full" />
      ) : data?.url ? (
        <video
          ref={player?.videoRef}
          src={data.url}
          controls
          preload="metadata"
          className="aspect-video w-full bg-stage"
          onTimeUpdate={player?.onTimeUpdate}
          onPlay={() => player?.onPlayingChange(true)}
          onPause={() => player?.onPlayingChange(false)}
        />
      ) : (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {t("recordingUnavailable")}
        </p>
      )}
    </div>
  );
};
