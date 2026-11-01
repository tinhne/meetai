"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon,
  ListTodoIcon,
  RadioIcon,
  VideoIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { InstantMeetingButton } from "@/modules/meetings/ui/components/instant-meeting-button";
import { MeetingStatusBadge } from "@/modules/meetings/ui/components/meeting-status-badge";
import { MeetingStatus } from "@/modules/meetings/types";
import { useTRPC } from "@/trpc/client";
import { OnboardingWizard } from "../components/onboarding-wizard";

const Panel = ({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

export const HomeView = () => {
  const t = useTranslations("home");
  const locale = useLocale();
  const format = useFormatter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const overviewQuery = trpc.dashboard.getOverview.queryOptions();
  const { data, isPending } = useQuery(overviewQuery);
  // Keep the wizard open through its last step even after the agent exists.
  const [onboarding, setOnboarding] = useState<boolean | null>(null);
  const showOnboarding = onboarding ?? (data ? !data.progress.hasAgent : false);

  const completeItem = useMutation(
    trpc.meetings.setActionItemStatus.mutationOptions({
      onSuccess: () => void queryClient.invalidateQueries(overviewQuery),
      onError: (error) => toast.error(error.message),
    }),
  );

  if (isPending || !data) {
    return (
      <div className="flex-1 py-8 px-4 md:px-8 flex flex-col gap-6 max-w-6xl w-full mx-auto">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="flex-1 py-8 px-4 md:px-8">
        <OnboardingWizard onDone={() => setOnboarding(false)} />
      </div>
    );
  }

  const checklist = [
    { done: data.progress.hasAgent, label: t("checkAgent"), href: "/dashboard/agents?new=1" },
    { done: data.progress.hasMeeting, label: t("checkMeeting"), href: "/dashboard/meetings?new=1" },
    { done: data.progress.hasHeldMeeting, label: t("checkHeld"), href: "/dashboard/meetings" },
    { done: data.progress.hasNotes, label: t("checkNotes"), href: "/dashboard/meetings?view=past" },
  ];
  const showChecklist = checklist.some((item) => !item.done);

  return (
    <div className="flex-1 py-8 px-4 md:px-8 flex flex-col gap-6 max-w-6xl w-full mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("greeting", {
              // Vietnamese names put the given name last.
              name:
                (locale === "vi"
                  ? session?.user.name?.split(" ").at(-1)
                  : session?.user.name?.split(" ")[0]) ?? "",
            })}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/meetings?new=1">
              <CalendarPlusIcon />
              {t("schedule")}
            </Link>
          </Button>
          <InstantMeetingButton size="lg" />
        </div>
      </div>

      {showChecklist && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h2 className="mb-3 text-sm font-semibold">{t("checklist")}</h2>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-primary/10",
                    item.done && "text-muted-foreground line-through",
                  )}
                >
                  {item.done ? (
                    <CheckCircle2Icon className="size-4 shrink-0 text-success" />
                  ) : (
                    <CircleIcon className="size-4 shrink-0 text-primary" />
                  )}
                  {item.label}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={<VideoIcon className="size-4 text-info" />} title={t("upcoming")}>
          {data.upcoming.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("upcomingEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.upcoming.map((meeting) => (
                <li key={meeting.id}>
                  <Link
                    href={meeting.status === "active" ? `/call/${meeting.id}` : `/dashboard/meetings/${meeting.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                  >
                    {meeting.status === "active" ? (
                      <RadioIcon className="size-4 shrink-0 animate-pulse text-info" aria-hidden />
                    ) : (
                      <CalendarPlusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{meeting.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {meeting.status === "active"
                          ? t("live")
                          : meeting.scheduledAt
                            ? format.dateTime(new Date(meeting.scheduledAt), {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : t("notScheduled")}
                      </span>
                    </span>
                    {meeting.status === "active" && (
                      <span className="text-xs font-medium text-primary">{t("join")}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon={<FileTextIcon className="size-4 text-ai" />}
          title={t("recent")}
          action={
            <Link
              href="/dashboard/meetings?view=past"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("viewAll")}
              <ArrowRightIcon className="size-3" />
            </Link>
          }
        >
          {data.recent.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("recentEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.recent.map((meeting) => (
                <li key={meeting.id}>
                  <Link
                    href={`/dashboard/meetings/${meeting.id}`}
                    className="flex flex-col gap-1 rounded-lg p-2 hover:bg-accent"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{meeting.name}</span>
                      {meeting.status !== "completed" && (
                        <MeetingStatusBadge status={meeting.status as MeetingStatus} />
                      )}
                    </span>
                    {meeting.tldr && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">{meeting.tldr}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={<ListTodoIcon className="size-4 text-warning" />} title={t("actionItems")}>
          {data.openActionItems.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("actionItemsEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.openActionItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent">
                  <Checkbox
                    id={`home-action-${item.id}`}
                    className="mt-0.5"
                    disabled={completeItem.isPending}
                    onCheckedChange={() =>
                      completeItem.mutate({ id: item.meetingId, actionItemId: item.id, status: "done" })
                    }
                  />
                  <label htmlFor={`home-action-${item.id}`} className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm">{item.text}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[item.owner, item.dueDate, item.meetingName].filter(Boolean).join(" · ")}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};
