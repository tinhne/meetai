"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, MailIcon, RefreshCwIcon, UsersIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_MODES, JOIN_MODES, type AiMode, type JoinMode } from "@/config/ai";
import { getPathname } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";
import type { MeetingGetOne } from "../../types";

export const InvitePanel = ({ meeting }: { meeting: MeetingGetOne }) => {
  const t = useTranslations("invite");
  const tAi = useTranslations("aiModes");
  const tJoin = useTranslations("joinModes");
  const locale = useLocale();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState("");

  const refresh = () =>
    queryClient.invalidateQueries(trpc.meetings.getOne.queryOptions({ id: meeting.id }));
  const onError = (error: { message: string }) => toast.error(error.message);

  const regenerate = useMutation(
    trpc.meetings.regenerateInviteCode.mutationOptions({
      onSuccess: () => {
        toast.success(t("regenerated"));
        void refresh();
      },
      onError,
    }),
  );
  const setJoinMode = useMutation(
    trpc.meetings.setJoinMode.mutationOptions({
      onSuccess: () => {
        toast.success(t("saved"));
        void refresh();
      },
      onError,
    }),
  );
  const setAiMode = useMutation(
    trpc.meetings.setAiMode.mutationOptions({
      onSuccess: () => {
        toast.success(t("saved"));
        void refresh();
      },
      onError,
    }),
  );
  const invite = useMutation(
    trpc.meetings.inviteByEmail.mutationOptions({
      onSuccess: ({ sent }) => {
        toast.success(t("sent", { count: sent }));
        setEmails("");
      },
      onError,
    }),
  );

  const joinPath = getPathname({ href: `/j/${meeting.inviteCode}`, locale });

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${joinPath}`);
    toast.success(t("copied"));
  };

  const sendInvites = (event: FormEvent) => {
    event.preventDefault();
    const list = emails
      .split(/[\s,;]+/)
      .map((email) => email.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    if (!list.every((email) => z.email().safeParse(email).success) || list.length > 10) {
      toast.error(t("invalidEmails"));
      return;
    }
    invite.mutate({ id: meeting.id, emails: list, locale: locale === "en" ? "en" : "vi" });
  };

  return (
    <section className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <UsersIcon className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={joinPath} aria-label={t("copy")} className="font-mono text-sm" />
        <div className="flex gap-2">
          <Button onClick={copyLink}>
            <CopyIcon />
            {t("copy")}
          </Button>
          <Button
            variant="outline"
            aria-label={t("regenerate")}
            onClick={() => regenerate.mutate({ id: meeting.id })}
            disabled={regenerate.isPending}
          >
            <RefreshCwIcon />
            {/* Not "sr-only sm:not-sr-only": not-sr-only resets white-space,
                so the row's min width is underestimated and it overflows. */}
            <span className="hidden sm:inline">{t("regenerate")}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>{t("joinModeLabel")}</Label>
          <Select
            value={meeting.joinMode}
            onValueChange={(value) =>
              setJoinMode.mutate({ id: meeting.id, joinMode: value as JoinMode })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOIN_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {tJoin(mode)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("aiModeLabel")}</Label>
          <Select
            value={meeting.aiMode}
            onValueChange={(value) =>
              setAiMode.mutate({ id: meeting.id, aiMode: value as AiMode })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {tAi(mode)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {tAi(`${meeting.aiMode as AiMode}Hint`)}
          </p>
        </div>
      </div>

      <form onSubmit={sendInvites} className="flex flex-col gap-2">
        <Label htmlFor="invite-emails">{t("emailsLabel")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="invite-emails"
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder={t("emailsPlaceholder")}
          />
          <Button type="submit" variant="outline" disabled={invite.isPending || !emails.trim()}>
            <MailIcon />
            {t("send")}
          </Button>
        </div>
      </form>
    </section>
  );
};
