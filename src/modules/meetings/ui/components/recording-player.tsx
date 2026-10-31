"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export const RecordingPlayer = ({ meetingId }: { meetingId: string }) => {
  const t = useTranslations("meetingDetail");
  const trpc = useTRPC();
  // Signed URLs are short-lived; refresh before they expire.
  const { data, isPending } = useQuery({
    ...trpc.meetings.getRecordingUrl.queryOptions({ id: meetingId }),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="bg-card rounded-xl border px-4 py-5">
      {isPending ? (
        <Skeleton className="aspect-video w-full rounded-lg" />
      ) : data?.url ? (
        <video src={data.url} controls preload="metadata" className="w-full rounded-lg" />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("recordingUnavailable")}
        </p>
      )}
    </div>
  );
};
