import { VideoIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface Props {
  meetingId: string;
  scheduledAt: string | null;
}

export const UpcomingState = ({ meetingId, scheduledAt }: Props) => {
  const t = useTranslations("meetingStates");
  const format = useFormatter();

  return (
    <div className="rounded-xl border bg-card px-4 py-8">
      <EmptyState
        title={t("upcomingTitle")}
        description={
          scheduledAt
            ? t("upcomingScheduled", {
                date: format.dateTime(new Date(scheduledAt), {
                  dateStyle: "full",
                  timeStyle: "short",
                }),
              })
            : t("upcomingDescription")
        }
        image="/upcoming.svg"
        action={
          <Button asChild>
            <Link href={`/call/${meetingId}`}>
              <VideoIcon />
              {t("start")}
            </Link>
          </Button>
        }
      />
    </div>
  );
};
