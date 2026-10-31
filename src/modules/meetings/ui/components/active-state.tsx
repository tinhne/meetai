import { VideoIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export const ActiveState = ({ meetingId }: { meetingId: string }) => {
  const t = useTranslations("meetingStates");

  return (
    <div className="rounded-xl border bg-card px-4 py-8">
      <EmptyState
        title={t("activeTitle")}
        description={t("activeDescription")}
        image="/upcoming.svg"
        action={
          <Button asChild>
            <Link href={`/call/${meetingId}`}>
              <VideoIcon />
              {t("join")}
            </Link>
          </Button>
        }
      />
    </div>
  );
};
