"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

interface Props {
  meetingId: string;
  reason: string | null;
}

export const FailedState = ({ meetingId, reason }: Props) => {
  const t = useTranslations("meetingDetail");
  const tStates = useTranslations("meetingStates");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const retry = useMutation(
    trpc.meetings.retryProcessing.mutationOptions({
      onSuccess: () => {
        toast.success(t("retryStarted"));
        void queryClient.invalidateQueries(
          trpc.meetings.getOne.queryOptions({ id: meetingId }),
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // The stored reason is an English note for logs (src/inngest/functions.ts);
  // only the timeout case gets its own message.
  const description = reason?.startsWith("Processing took too long")
    ? tStates("failedTimedOut")
    : tStates("failedDescription");

  return (
    <div className="bg-card rounded-xl border px-4 py-8 flex flex-col gap-y-8 items-center">
      <EmptyState
        title={tStates("failedTitle")}
        description={description}
        image="/cancelled.svg"
        action={
          <Button
            onClick={() => retry.mutate({ id: meetingId })}
            disabled={retry.isPending}
          >
            <RotateCcwIcon />
            {t("retryProcessing")}
          </Button>
        }
      />
    </div>
  );
};
