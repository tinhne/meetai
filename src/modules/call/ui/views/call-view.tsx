"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { canJoinMeeting } from "@/modules/meetings/lib/rules";
import { useTRPC } from "@/trpc/client";
import { CallProvider } from "../component/call-provider";

interface Props {
  meetingId: string;
}

const UNAVAILABLE = ["completed", "processing", "cancelled", "failed"] as const;

export const CallView = ({ meetingId }: Props) => {
  const t = useTranslations("callUnavailable");
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId }),
  );

  if (!canJoinMeeting(data.status)) {
    const key = (UNAVAILABLE as readonly string[]).includes(data.status)
      ? (data.status as (typeof UNAVAILABLE)[number])
      : "failed";

    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <ErrorState title={t(`${key}Title`)} description={t(`${key}Description`)} />
        <Button asChild variant="secondary">
          <Link href={`/dashboard/meetings/${data.id}`}>{t("back")}</Link>
        </Button>
      </div>
    );
  }

  return <CallProvider meeting={data} />;
};
