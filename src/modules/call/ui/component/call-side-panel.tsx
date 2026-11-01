"use client";

import {
  hasAudio,
  useCallStateHooks,
  useConnectedUser,
} from "@stream-io/video-react-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicIcon, MicOffIcon, SendIcon, UserXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/hooks/use-confirm";
import { useTRPC } from "@/trpc/client";
import { useCallRoom } from "./call-context";
import type { CallChatMessage } from "./use-call-chat";

interface Props {
  chat: { messages: CallChatMessage[]; send: (text: string) => Promise<void> };
  tab: "people" | "chat";
  onTabChange: (tab: "people" | "chat") => void;
}

export const CallSidePanel = ({ chat, tab, onTabChange }: Props) => {
  const t = useTranslations("call");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as "people" | "chat")}
      className="flex h-full flex-col gap-0"
    >
      <TabsList className="m-3 grid grid-cols-2">
        <TabsTrigger value="people">{t("peopleTab")}</TabsTrigger>
        <TabsTrigger value="chat">{t("chatTab")}</TabsTrigger>
      </TabsList>
      <TabsContent value="people" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <PeopleList />
      </TabsContent>
      <TabsContent value="chat" className="min-h-0 flex-1 flex flex-col">
        <ChatPanel chat={chat} />
      </TabsContent>
    </Tabs>
  );
};

// Host-only: everyone who asked to join (polled every few seconds).
export const useWaitingList = () => {
  const trpc = useTRPC();
  const { meetingId, isHost } = useCallRoom();

  const { data } = useQuery({
    ...trpc.meetings.getParticipants.queryOptions({ id: meetingId }),
    enabled: isHost,
    refetchInterval: 4000,
  });

  const participants = data ?? [];
  const waiting = participants.filter((participant) => participant.status === "waiting");

  return { participants, waiting };
};

// Toast once for each new person in the waiting room.
export const useWaitingToasts = (waiting: { id: string; name: string }[]) => {
  const t = useTranslations("call");
  const seen = useRef(new Set<string>());

  useEffect(() => {
    for (const participant of waiting) {
      if (!seen.current.has(participant.id)) {
        seen.current.add(participant.id);
        toast.info(t("newWaiting", { name: participant.name }));
      }
    }
  }, [waiting, t]);
};

const PeopleList = () => {
  const t = useTranslations("call");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { meetingId, isHost, agentId } = useCallRoom();
  const me = useConnectedUser();
  const { useParticipants } = useCallStateHooks();
  const live = useParticipants();
  const { participants, waiting } = useWaitingList();
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [RemoveConfirmation, confirmRemove] = useConfirm(
    t("removeConfirmTitle", { name: pendingRemove ?? "" }),
    t("removeConfirmDescription"),
    { destructive: true },
  );

  const refresh = () =>
    queryClient.invalidateQueries(
      trpc.meetings.getParticipants.queryOptions({ id: meetingId }),
    );

  const setStatus = useMutation(
    trpc.meetings.setParticipantStatus.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    }),
  );
  const mute = useMutation(
    trpc.meetings.muteParticipants.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );

  const byStreamId = new Map(participants.map((participant) => [participant.streamUserId, participant]));
  // One row per person even if they joined from two tabs.
  const people = [...new Map(live.map((participant) => [participant.userId, participant])).values()];

  const remove = async (streamUserId: string, name: string) => {
    const record = byStreamId.get(streamUserId);
    if (!record) return;
    setPendingRemove(name);
    const ok = await confirmRemove();
    if (ok) setStatus.mutate({ id: meetingId, participantId: record.id, status: "removed" });
  };

  return (
    <div className="flex flex-col gap-5">
      <RemoveConfirmation />
      {isHost && waiting.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("waiting")} ({waiting.length})
          </h3>
          {waiting.map((participant) => (
            <div key={participant.id} className="flex items-center gap-2 rounded-lg border p-2">
              <GeneratedAvatar seed={participant.name} variant="initials" className="size-8" />
              <span className="flex-1 truncate text-sm">{participant.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setStatus.mutate({ id: meetingId, participantId: participant.id, status: "denied" })
                }
              >
                {t("deny")}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setStatus.mutate({ id: meetingId, participantId: participant.id, status: "admitted" })
                }
              >
                {t("admit")}
              </Button>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("inCall")} ({people.length})
          </h3>
          {isHost && people.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => mute.mutate({ id: meetingId })}>
              <MicOffIcon />
              {t("muteAll")}
            </Button>
          )}
        </div>
        {people.map((participant) => {
          const isAgent = participant.userId === agentId;
          const isMe = participant.userId === me?.id;
          const record = byStreamId.get(participant.userId);
          const name = participant.name || participant.userId;

          return (
            <div key={participant.sessionId} className="flex items-center gap-2 rounded-lg p-2 hover:bg-accent">
              <GeneratedAvatar
                seed={name}
                variant={isAgent ? "botttsNeutral" : "initials"}
                className="size-8"
              />
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-sm">{name}</span>
                {isMe && <Badge variant="outline">{t("you")}</Badge>}
                {isAgent && <Badge className="bg-ai text-ai-foreground">{t("aiBadge")}</Badge>}
                {record?.isGuest && <Badge variant="secondary">{t("guestBadge")}</Badge>}
              </div>
              {hasAudio(participant) ? (
                <MicIcon className="size-4 text-muted-foreground" aria-hidden />
              ) : (
                <MicOffIcon className="size-4 text-muted-foreground" aria-hidden />
              )}
              {isHost && !isMe && !isAgent && (
                <>
                  {hasAudio(participant) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={`${t("mute")} ${name}`}
                      onClick={() => mute.mutate({ id: meetingId, streamUserId: participant.userId })}
                    >
                      <MicOffIcon />
                    </Button>
                  )}
                  {record && record.role !== "host" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      aria-label={`${t("remove")} ${name}`}
                      onClick={() => void remove(participant.userId, name)}
                    >
                      <UserXIcon />
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

const ChatPanel = ({ chat }: Pick<Props, "chat">) => {
  const t = useTranslations("call");
  const me = useConnectedUser();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat.messages.length]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = text;
    setText("");
    try {
      await chat.send(message);
    } catch {
      setText(message);
    }
  };

  return (
    <>
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 flex flex-col gap-3" aria-live="polite">
        {chat.messages.length === 0 && (
          <p className="m-auto max-w-56 text-center text-sm text-muted-foreground">{t("chatEmpty")}</p>
        )}
        {chat.messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {message.userId === me?.id ? t("you") : message.userName}
            </span>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words">
              {message.text}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("chatPlaceholder")}
          aria-label={t("chatPlaceholder")}
          maxLength={2000}
        />
        <Button type="submit" size="icon" aria-label={t("send")} disabled={!text.trim()}>
          <SendIcon />
        </Button>
      </form>
    </>
  );
};
