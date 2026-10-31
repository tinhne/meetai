import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";

export const CancelledState = () => {
  const t = useTranslations("meetingStates");

  return (
    <div className="rounded-xl border bg-card px-4 py-8">
      <EmptyState
        title={t("cancelledTitle")}
        description={t("cancelledDescription")}
        image="/cancelled.svg"
      />
    </div>
  );
};
