"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ZapIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";

interface Props extends Omit<ComponentProps<typeof Button>, "onClick"> {
  agentId?: string;
  name?: string;
}

// "Meet now": creates a meeting with defaults and goes straight to the call.
export const InstantMeetingButton = ({ agentId, name, children, ...props }: Props) => {
  const t = useTranslations("meetings");
  const format = useFormatter();
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const create = useMutation(
    trpc.meetings.createInstant.mutationOptions({
      onSuccess: (meeting) => {
        void queryClient.invalidateQueries(trpc.premium.getFreeUsage.queryOptions());
        router.push(`/call/${meeting.id}`);
      },
      onError: (error) => {
        if (error.data?.code === "PRECONDITION_FAILED") {
          toast.error(t("needAgent"));
          router.push("/dashboard/agents?new=1");
          return;
        }
        toast.error(error.message);
        if (error.data?.code === "FORBIDDEN") router.push("/dashboard/upgrade");
      },
    }),
  );

  return (
    <Button
      {...props}
      disabled={create.isPending || props.disabled}
      onClick={() =>
        create.mutate({
          agentId,
          name:
            name ??
            t("instantName", {
              time: format.dateTime(new Date(), { hour: "2-digit", minute: "2-digit" }),
            }),
        })
      }
    >
      {children ?? (
        <>
          <ZapIcon />
          {t("meetNow")}
        </>
      )}
    </Button>
  );
};
