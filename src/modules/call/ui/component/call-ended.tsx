"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useCallRoom } from "./call-context";

interface Props {
  endedForAll: boolean;
  onEndedForAll: () => void;
}

export const CallEnded = ({ endedForAll, onEndedForAll }: Props) => {
  const t = useTranslations("call");
  const trpc = useTRPC();
  const { meetingId, isHost, canRate, backHref } = useCallRoom();
  const [rating, setRating] = useState(0);

  // Hosts see when the notes are ready without leaving the page.
  const { data: meeting } = useQuery({
    ...trpc.meetings.getOne.queryOptions({ id: meetingId }),
    enabled: isHost,
    refetchInterval: (query) =>
      query.state.data?.status === "completed" ? false : 10_000,
  });
  const notesReady = meeting?.status === "completed";

  const endCall = useMutation(
    trpc.meetings.endCall.mutationOptions({
      onSuccess: () => onEndedForAll(),
      onError: (error) => toast.error(error.message),
    }),
  );
  const feedback = useMutation(
    trpc.meetings.submitFeedback.mutationOptions({
      onSuccess: () => toast.success(t("rateThanks")),
      onError: (error) => toast.error(error.message),
    }),
  );

  const ended = endedForAll || (meeting && meeting.status !== "active");

  return (
    <div className="flex min-h-svh items-center justify-center bg-radial from-sidebar-accent to-stage p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl bg-card p-8 text-center text-card-foreground shadow-lg">
        {notesReady ? (
          <>
            <CheckCircle2Icon className="size-10 text-success" />
            <h1 className="text-xl font-semibold">{t("summaryReady")}</h1>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold">
              {ended ? t("endedTitle") : t("leftTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ended ? t("endedDescription") : t("leftDescription")}
            </p>
          </div>
        )}

        {canRate && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium">{t("rateTitle")}</p>
            <div className="flex gap-1" role="radiogroup" aria-label={t("rateTitle")}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={t("rateStar", { count: value })}
                  disabled={feedback.isPending}
                  onClick={() => {
                    setRating(value);
                    feedback.mutate({ id: meetingId, rating: value });
                  }}
                  className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <StarIcon
                    className={cn(
                      "size-7 transition-colors",
                      value <= rating ? "fill-warning text-warning" : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          {backHref && (
            <Button asChild variant={notesReady ? "default" : "outline"}>
              <Link href={backHref}>
                {notesReady ? t("viewSummary") : t("backToMeeting")}
              </Link>
            </Button>
          )}
          {isHost && !ended && (
            <Button disabled={endCall.isPending} onClick={() => endCall.mutate({ id: meetingId })}>
              {t("endNow")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
