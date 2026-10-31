"use client";

import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import Highlighter from "react-highlight-words";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { generateAvatar } from "@/lib/avatar";
import { cn, formatTimestamp } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMeetingPlayer } from "./meeting-player";

interface Props {
  meetingid: string;
}

const ALL = "__all__";

export const Transcript = ({ meetingid }: Props) => {
  const t = useTranslations("notes");
  const trpc = useTRPC();
  const player = useMeetingPlayer();
  const { data, isPending } = useQuery(
    trpc.meetings.getTranscription.queryOptions({ id: meetingid }),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [speaker, setSpeaker] = useState(ALL);
  const [follow, setFollow] = useState(true);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const speakers = useMemo(
    () => [...new Set((data ?? []).map((item) => item.user?.name ?? ""))].filter(Boolean),
    [data],
  );

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return (data ?? []).filter(
      (item) =>
        (speaker === ALL || item.user?.name === speaker) &&
        (!query || item.text?.toLowerCase().includes(query)),
    );
  }, [data, searchQuery, speaker]);

  const currentMs = player?.currentMs ?? 0;
  const hasMedia = player?.hasMedia ?? false;
  const isPlaying = player?.isPlaying ?? false;

  // The segment being played: the last one that started before "now".
  let activeIndex = -1;
  if (hasMedia) {
    filtered.forEach((item, position) => {
      if (item.start_ts <= currentMs) activeIndex = position;
    });
  }

  useEffect(() => {
    if (follow && isPlaying) {
      activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex, follow, isPlaying]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4" aria-label={t("tabs.transcript")}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("transcriptSearch")}
            aria-label={t("transcriptSearch")}
            className="h-9 pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {speakers.length > 1 && (
          <Select value={speaker} onValueChange={setSpeaker}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allSpeakers")}</SelectItem>
              {speakers.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {player?.hasMedia && (
          <div className="flex items-center gap-2">
            <Switch id="follow-video" checked={follow} onCheckedChange={setFollow} />
            <Label htmlFor="follow-video" className="text-sm font-normal">
              {t("follow")}
            </Label>
          </div>
        )}
      </div>

      <div className="flex max-h-[60svh] flex-col gap-1 overflow-y-auto pr-1">
        {isPending &&
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        {!isPending && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("transcriptEmpty")}</p>
        )}
        {filtered.map((item, index) => {
          const isActive = index === activeIndex;
          const name = item.user?.name ?? "Unknown Speaker";
          return (
            <button
              key={`${item.speaker_id}-${item.start_ts}-${index}`}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => player?.seek(item.start_ts)}
              disabled={!player?.hasMedia}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg p-3 text-left transition-colors enabled:hover:bg-accent disabled:cursor-default",
                isActive && "bg-primary/10 ring-1 ring-primary/30",
              )}
            >
              <span className="flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarImage src={item.user?.image || generateAvatar(name, "initials")} alt="" />
                </Avatar>
                <span className="text-sm font-medium">{name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(item.start_ts)}
                </span>
              </span>
              <Highlighter
                searchWords={[searchQuery]}
                autoEscape
                textToHighlight={item.text ?? ""}
                className="text-sm leading-relaxed text-foreground/85"
                highlightClassName="rounded-sm bg-warning/25 text-foreground"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};
