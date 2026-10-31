"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BanIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  DownloadIcon,
  FileDownIcon,
  MoreVerticalIcon,
  PencilIcon,
  PrinterIcon,
  Share2Icon,
  TrashIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPathname, Link } from "@/i18n/navigation";
import type { MeetingInsights } from "@/server/ai/schemas";
import { useTRPC } from "@/trpc/client";
import { buildMeetingMarkdown, slugifyFileName } from "../../lib/export";
import type { MeetingGetOne } from "../../types";
import { ShareDialog } from "./share-dialog";

interface Props {
  meeting: MeetingGetOne;
  onEdit: () => void;
  onDelete: () => void;
  onCancel?: () => void;
}

export const MeetingIdViewHeader = ({ meeting, onEdit, onDelete, onCancel }: Props) => {
  const t = useTranslations("meetings");
  const tNotes = useTranslations("notes");
  const format = useFormatter();
  const locale = useLocale();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const isCompleted = meeting.status === "completed";
  const insights = meeting.insights as MeetingInsights | null;

  const downloadMarkdown = async () => {
    const [transcript, actionItems] = await Promise.all([
      queryClient.fetchQuery(trpc.meetings.getTranscription.queryOptions({ id: meeting.id })),
      queryClient.fetchQuery(trpc.meetings.getActionItems.queryOptions({ id: meeting.id })),
    ]);
    const markdown = buildMeetingMarkdown({
      name: meeting.name,
      date: meeting.startedAt
        ? format.dateTime(new Date(meeting.startedAt), { dateStyle: "medium", timeStyle: "short" })
        : null,
      agentName: meeting.agent.name,
      insights,
      summary: meeting.summary,
      actionItems,
      transcript: transcript.map((item) => ({
        speakerName: item.user?.name ?? "",
        startMs: item.start_ts,
        text: item.text ?? "",
      })),
      labels: {
        tldr: tNotes("tldr"),
        decisions: tNotes("decisions"),
        actionItems: tNotes("tabs.actionItems"),
        openQuestions: tNotes("openQuestions"),
        notes: tNotes("fullNotes"),
        transcript: tNotes("tabs.transcript"),
      },
    });
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugifyFileName(meeting.name)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(insights?.tldr ?? meeting.summary ?? "");
    toast.success(tNotes("export.copied"));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {isCompleted && (
        <ShareDialog meetingId={meeting.id} open={shareOpen} onOpenChange={setShareOpen} />
      )}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/meetings">{t("breadcrumb")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRightIcon />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[60vw] truncate text-lg font-semibold">
              {meeting.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-2">
        {isCompleted && (
          <>
            <Button variant="outline" onClick={() => setShareOpen(true)}>
              <Share2Icon />
              {t("menu.share")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <DownloadIcon />
                  {t("menu.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void downloadMarkdown()}>
                  <FileDownIcon />
                  {tNotes("export.markdown")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    window.open(getPathname({ href: `/print/meetings/${meeting.id}`, locale }), "_blank")
                  }
                >
                  <PrinterIcon />
                  {tNotes("export.print")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void copySummary()}>
                  <ClipboardCopyIcon />
                  {tNotes("export.copySummary")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("menu.more")}>
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon />
              {t("menu.edit")}
            </DropdownMenuItem>
            {onCancel && (
              <DropdownMenuItem onSelect={onCancel}>
                <BanIcon />
                {t("menu.cancelMeeting")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              <TrashIcon />
              {t("menu.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
