"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { TimestampButton } from "./timestamp-button";

export const ActionItemsPanel = ({ meetingId }: { meetingId: string }) => {
  const t = useTranslations("notes");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryOptions = trpc.meetings.getActionItems.queryOptions({ id: meetingId });
  const { data, isPending } = useQuery(queryOptions);

  const setStatus = useMutation(
    trpc.meetings.setActionItemStatus.mutationOptions({
      // Optimistic: tick immediately, roll back on error.
      onMutate: async ({ actionItemId, status }) => {
        await queryClient.cancelQueries(queryOptions);
        const previous = queryClient.getQueryData(queryOptions.queryKey);
        queryClient.setQueryData(queryOptions.queryKey, (items) =>
          items?.map((item) => (item.id === actionItemId ? { ...item, status } : item)),
        );
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) queryClient.setQueryData(queryOptions.queryKey, context.previous);
        toast.error(error.message);
      },
      onSettled: () => {
        void queryClient.invalidateQueries(queryOptions);
        void queryClient.invalidateQueries(trpc.dashboard.getOverview.queryOptions());
      },
    }),
  );

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-4 py-10 text-center">
        <ListTodoIcon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("actionItemsEmpty")}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {data.map((item) => {
        const done = item.status === "done";
        return (
          <li key={item.id} className="flex items-start gap-3 p-4">
            <Checkbox
              id={`action-${item.id}`}
              checked={done}
              className="mt-0.5"
              onCheckedChange={(checked) =>
                setStatus.mutate({
                  id: meetingId,
                  actionItemId: item.id,
                  status: checked === true ? "done" : "open",
                })
              }
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label
                htmlFor={`action-${item.id}`}
                className={cn("text-sm leading-relaxed", done && "text-muted-foreground line-through")}
              >
                {item.text}
              </label>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                <span>{item.owner ? t("owner", { name: item.owner }) : t("unassigned")}</span>
                {item.dueDate && <span>{t("due", { date: item.dueDate })}</span>}
                {item.sourceMs !== null && <TimestampButton ms={item.sourceMs} />}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
