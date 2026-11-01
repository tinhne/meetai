"use client";

import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { MeetingIdViewHeader } from "../components/meeting-id-view-header";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/hooks/use-confirm";
import { UpdateMeetingDialog } from "../components/update-meeting-dialog";
import { useState } from "react";
import { UpcomingState } from "../components/upcoming-state";
import { ActiveState } from "../components/active-state";
import { CancelledState } from "../components/cancelled-state";
import { ProcessingState } from "../components/processing-state";
import { CompletedState } from "../components/complete-state";
import { FailedState } from "../components/failed-state";
import { InvitePanel } from "../components/invite-panel";
import { toast } from "sonner";

interface Props {
  meetingId: string;
}

export const MeetingIdView = ({ meetingId }: Props) => {
  const t = useTranslations("meetings");
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [updateMeetingDialogOpen, setUpdateMeetingDialogOpen] = useState(false);

  const [RemoveConfirmation, conFirmRemove] = useConfirm(
    t("deleteConfirmTitle"),
    t("deleteConfirmDescription"),
    { destructive: true },
  );
  const [CancelConfirmation, confirmCancel] = useConfirm(
    t("cancelConfirmTitle"),
    t("cancelConfirmDescription"),
    { destructive: true },
  );

  const { data } = useSuspenseQuery({
    ...trpc.meetings.getOne.queryOptions({ id: meetingId }),
    // Pick up the summary as soon as processing finishes.
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 10_000 : false,
  });

  const removeMeeting = useMutation(
    trpc.meetings.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.billing.getOverview.queryOptions());
        toast.success(t("deleted"));
        router.push("/dashboard/meetings");
      },
    }),
  );

  const cancelMeeting = useMutation(
    trpc.meetings.cancel.mutationOptions({
      onSuccess: () => {
        toast.success(t("cancelled"));
        queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.meetings.getOne.queryOptions({ id: meetingId }),
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const handleCancelMeeting = async () => {
    const ok = await confirmCancel();
    if (!ok) return;
    cancelMeeting.mutate({ id: meetingId });
  };

  const handleRemoveMeeting = async () => {
    const ok = await conFirmRemove();

    if (!ok) {
      return;
    }

    removeMeeting.mutate({ id: meetingId });
  };

  const isActive = data.status === "active";
  const isCompleted = data.status === "completed";
  const isCancelled = data.status === "cancelled";
  const isProcessing = data.status === "processing";
  const isUpcoming = data.status === "upcoming";
  const isFailed = data.status === "failed";

  return (
    <>
      <RemoveConfirmation />
      <CancelConfirmation />
      <UpdateMeetingDialog
        open={updateMeetingDialogOpen}
        onOpenChange={setUpdateMeetingDialogOpen}
        initialValues={data}
      />
      <div className="flex-1 py-6 px-4 md:px-8 flex flex-col gap-y-4">
        <MeetingIdViewHeader
          meeting={data}
          onEdit={() => setUpdateMeetingDialogOpen(true)}
          onDelete={handleRemoveMeeting}
          onCancel={isUpcoming ? handleCancelMeeting : undefined}
        />
        {isCancelled && <CancelledState />}
        {isCompleted && <CompletedState data={data} />}
        {isProcessing && <ProcessingState stage={data.processingStage} />}
        {isActive && <ActiveState meetingId={meetingId} />}
        {isFailed && (
          <FailedState meetingId={meetingId} reason={data.failedReason} />
        )}
        {isUpcoming && (
          <UpcomingState meetingId={meetingId} scheduledAt={data.scheduledAt} />
        )}
        {(isUpcoming || isActive) && <InvitePanel meeting={data} />}
      </div>
    </>
  );
};

export const MeetingIdViewLoading = () => {
  return (
    <div className="flex-1 py-6 px-4 md:px-8 flex flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
};

export const MeetingIdViewError = () => {
  const t = useTranslations("states");
  return <ErrorState title={t("errorTitle")} description={t("errorDescription")} />;
};
