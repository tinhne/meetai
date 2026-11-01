"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MicIcon, VideoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/error-state";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "@/i18n/navigation";
import { InstantMeetingButton } from "@/modules/meetings/ui/components/instant-meeting-button";
import { AgentLearning } from "@/modules/memory/ui/components/agent-learning";
import { useTRPC } from "@/trpc/client";
import { AgentIdViewHeader } from "../components/agent-id-view-header";
import { AgentTestChat } from "../components/agent-test-chat";
import { UpdateAgentDialog } from "../components/update-agent-dialog";

interface Props {
  agentId: string;
}

export const AgentViewId = ({ agentId }: Props) => {
  const t = useTranslations("agents");
  const tMeetings = useTranslations("agents.columns");
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updateAgentDialog, setUpdateAgentDialog] = useState(false);

  const { data } = useSuspenseQuery(trpc.agents.getOne.queryOptions({ id: agentId }));

  const removeAgent = useMutation(
    trpc.agents.remove.mutationOptions({
      onSuccess: async () => {
        toast.success(t("deleted"));
        await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions({}));
        await queryClient.invalidateQueries(trpc.billing.getOverview.queryOptions());
        router.push("/dashboard/agents");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const [RemoveConfirmation, confirmRemove] = useConfirm(
    t("deleteConfirmTitle"),
    t("deleteConfirmDescription", { count: data.meetingCount }),
    { destructive: true },
  );

  const handleRemoveAgent = async () => {
    const ok = await confirmRemove();
    if (ok) removeAgent.mutate({ id: agentId });
  };

  return (
    <>
      <RemoveConfirmation />
      <UpdateAgentDialog
        open={updateAgentDialog}
        onOpenChange={setUpdateAgentDialog}
        initialValues={data}
      />
      <div className="flex-1 py-6 px-4 md:px-8 flex flex-col gap-y-4">
        <AgentIdViewHeader
          agentName={data.name}
          onEdit={() => setUpdateAgentDialog(true)}
          onDelete={handleRemoveAgent}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex flex-col gap-5 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-4">
              <GeneratedAvatar variant="botttsNeutral" seed={data.name} className="size-14" />
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
                <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 capitalize">
                    <MicIcon className="size-4" aria-hidden />
                    {t("detail.voice", { voice: data.voice })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <VideoIcon className="size-4 text-info" aria-hidden />
                    {tMeetings("meetingCount", { count: data.meetingCount })}
                  </span>
                </div>
              </div>
            </div>
            <InstantMeetingButton agentId={data.id} className="self-start" />
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">{t("detail.instructions")}</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {data.instructions}
              </p>
            </div>
          </section>
          <AgentTestChat agentId={data.id} />
        </div>
        <AgentLearning agentId={data.id} memoryEnabled={data.memoryEnabled} />
      </div>
    </>
  );
};

export const AgentsIdViewLoading = () => {
  return (
    <div className="flex-1 py-6 px-4 md:px-8 grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
};

export const AgentsIdViewError = () => {
  const t = useTranslations("states");
  return <ErrorState title={t("errorTitle")} description={t("errorDescription")} />;
};
