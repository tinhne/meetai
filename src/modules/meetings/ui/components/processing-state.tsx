import { CheckIcon, LoaderIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const STAGES = ["waiting", "transcribing", "summarizing", "done"] as const;
const STAGE_KEYS = {
  waiting: "stepWaiting",
  transcribing: "stepTranscribing",
  summarizing: "stepSummarizing",
  done: "stepDone",
} as const;

export const ProcessingState = ({ stage }: { stage: string | null }) => {
  const t = useTranslations("meetingStates");
  const current = Math.max(0, STAGES.indexOf((stage ?? "waiting") as (typeof STAGES)[number]));

  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border bg-card px-4 py-10 text-center">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("processingTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("processingDescription")}</p>
      </div>
      <ol className="flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {STAGES.map((item, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={item}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-2 sm:flex-1 sm:flex-col"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-sm",
                  done && "border-success bg-success text-primary-foreground",
                  active && "border-ai text-ai",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckIcon className="size-4" />
                ) : active ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  index + 1
                )}
              </span>
              <span className={cn("text-sm", !done && !active && "text-muted-foreground")}>
                {t(STAGE_KEYS[item])}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
