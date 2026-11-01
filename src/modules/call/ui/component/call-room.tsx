"use client";

import {
  PaginatedGridLayout,
  ReactionsButton,
  ScreenShareButton,
  SpeakerLayout,
  SpeakingWhileMutedNotification,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { useMutation } from "@tanstack/react-query";
import {
  CaptionsIcon,
  LayoutGridIcon,
  LogOutIcon,
  PhoneOffIcon,
  PresentationIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AIStatusIndicator, type AIStatus } from "@/components/ai-status-indicator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AiMode } from "@/config/ai";
import { useConfirm } from "@/hooks/use-confirm";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, formatTimestamp } from "@/lib/utils";
import { nextAutoAiMode } from "@/modules/meetings/lib/rules";
import { toStreamTranscriptionLanguage } from "@/modules/meetings/lib/stream";
import { useTRPC } from "@/trpc/client";
import { useCallRoom } from "./call-context";
import { CallHostMenu } from "./call-host-menu";
import { CallSidePanel, useWaitingList, useWaitingToasts } from "./call-side-panel";
import { useCallChat } from "./use-call-chat";

interface Props {
  onLeave: (forEveryone: boolean) => Promise<void>;
}

const useElapsed = (startedAt: Date | undefined) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return startedAt ? formatTimestamp(now - startedAt.getTime()) : "0:00";
};

export const CallRoom = ({ onLeave }: Props) => {
  const t = useTranslations("call");
  const trpc = useTRPC();
  const room = useCallRoom();
  const isMobile = useIsMobile();
  const {
    useCallStartedAt,
    useIsCallRecordingInProgress,
    useParticipantCount,
    useParticipants,
    useHasOngoingScreenShare,
    useCallClosedCaptions,
  } = useCallStateHooks();

  const startedAt = useCallStartedAt();
  const elapsed = useElapsed(startedAt);
  const isRecording = useIsCallRecordingInProgress();
  const participantCount = useParticipantCount();
  const participants = useParticipants();
  const hasScreenShare = useHasOngoingScreenShare();
  const captions = useCallClosedCaptions();
  const chat = useCallChat();
  const { waiting } = useWaitingList();
  useWaitingToasts(waiting);

  const [aiMode, setAiMode] = useState(room.aiMode as AiMode);
  const [layout, setLayout] = useState<"grid" | "speaker">("speaker");
  const [showCaptions, setShowCaptions] = useState(false);
  const [panelOpen, setPanelOpen] = useState(!isMobile && room.isHost);
  const [panelTab, setPanelTab] = useState<"people" | "chat">("people");
  const [EndConfirmation, confirmEnd] = useConfirm(
    t("endConfirmTitle"),
    t("endConfirmDescription"),
    { destructive: true, confirmLabel: t("endForAll") },
  );

  const agent = participants.find((participant) => participant.userId === room.agentId);
  const agentName = agent?.name || "AI";
  const hasAgent = !!agent;
  // People in the room, not counting the AI.
  const people = participants.filter((participant) => participant.userId !== room.agentId).length;
  const isGroup = people >= 2;
  const aiStatus: AIStatus = !agent || aiMode === "silent"
    ? "off"
    : agent.isSpeaking
      ? "speaking"
      : "listening";
  const effectiveLayout = hasScreenShare ? "speaker" : layout;
  const captionsSupported =
    room.language === "auto" ||
    toStreamTranscriptionLanguage(room.language) === room.language;
  const speakerNames = new Map(participants.map((participant) => [participant.userId, participant.name]));

  const endCall = useMutation(
    trpc.meetings.endCall.mutationOptions({
      onSuccess: () => void onLeave(true),
      onError: (error) => toast.error(error.message),
    }),
  );

  // Host only: a 1-1 AI chat becomes "answer when called" while a second
  // person is in the room, and back when they leave. A mode the host picks
  // by hand turns this off for the rest of the call.
  const autoSwitched = useRef(false);
  const manualMode = useRef(false);
  const lastAttempt = useRef<string | null>(null);
  const { mutate: switchAiMode, isPending: switchingAiMode } = useMutation(
    trpc.meetings.setAiMode.mutationOptions(),
  );
  useEffect(() => {
    if (!room.isHost || !hasAgent || switchingAiMode || manualMode.current) return;
    const next = nextAutoAiMode({ mode: aiMode, people, autoSwitched: autoSwitched.current });
    const attempt = `${next}:${people}`;
    if (!next || lastAttempt.current === attempt) return;
    lastAttempt.current = attempt;
    switchAiMode(
      { id: room.meetingId, aiMode: next },
      {
        onSuccess: ({ aiMode: mode }) => {
          autoSwitched.current = mode === "on_demand";
          setAiMode(mode);
          toast.info(
            t(mode === "on_demand" ? "aiAutoOnDemand" : "aiAutoConversational", {
              name: agentName,
            }),
          );
        },
      },
    );
  }, [room.isHost, room.meetingId, hasAgent, switchingAiMode, aiMode, people, agentName, switchAiMode, t]);

  const [asking, setAsking] = useState(false);
  const askAi = async () => {
    setAsking(true);
    try {
      await room.askAgent();
      toast.success(t("askAiSent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setAsking(false);
    }
  };

  const panel = (
    <CallSidePanel chat={chat} tab={panelTab} onTabChange={setPanelTab} />
  );

  return (
    <div className="flex h-svh flex-col bg-stage text-stage-foreground">
      <EndConfirmation />

      <header className="flex items-center gap-3 px-4 py-3">
        <Image src="/logo.svg" alt="" aria-hidden width={24} height={24} />
        <h1 className="min-w-0 truncate text-sm font-medium md:text-base">{room.meetingName}</h1>
        <span className="font-mono text-xs tabular-nums opacity-70">{elapsed}</span>
        {isRecording && (
          <span className="flex items-center gap-1.5 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
            <span className="size-2 animate-pulse rounded-full bg-destructive" aria-hidden />
            {t("recording")}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <AIStatusIndicator status={aiStatus} className="hidden sm:inline-flex" />
          <span className="flex items-center gap-1 text-xs opacity-80">
            <UsersIcon className="size-4" aria-hidden />
            {t("people", { count: participantCount })}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 px-3">
        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-stage-surface">
          {effectiveLayout === "grid" ? <PaginatedGridLayout /> : <SpeakerLayout />}

          {agent && isGroup && aiMode !== "silent" && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
              <p className="rounded-full bg-black/60 px-3 py-1 text-center text-xs">
                {t("aiGroupNotice", { name: agentName })}
              </p>
            </div>
          )}

          {showCaptions && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
              <div className="max-w-2xl rounded-xl bg-black/70 px-4 py-2 text-center text-sm leading-relaxed">
                {captionsSupported ? (
                  captions.slice(-2).map((caption) => (
                    <p key={caption.id ?? `${caption.speaker_id}-${caption.start_time}`}>
                      <span className="font-semibold">
                        {speakerNames.get(caption.speaker_id) ?? caption.speaker_id}:
                      </span>{" "}
                      {caption.text}
                    </p>
                  ))
                ) : (
                  <p>{t("captionsUnsupported")}</p>
                )}
              </div>
            </div>
          )}
        </main>

        {panelOpen && !isMobile && (
          <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl bg-card text-card-foreground">
            {panel}
          </aside>
        )}
      </div>

      {isMobile && (
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent side="bottom" className="h-[75svh] p-0">
            <SheetTitle className="sr-only">{t("panel")}</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      )}

      <footer className="flex flex-wrap items-center justify-center gap-2 px-3 py-3">
        <SpeakingWhileMutedNotification>
          <ToggleAudioPublishingButton />
        </SpeakingWhileMutedNotification>
        <ToggleVideoPublishingButton />
        <ScreenShareButton />
        <ReactionsButton />

        <RoomButton
          label={t("captions")}
          active={showCaptions}
          onClick={() => setShowCaptions((value) => !value)}
        >
          <CaptionsIcon />
        </RoomButton>
        <RoomButton
          label={layout === "grid" ? t("layoutSpeaker") : t("layoutGrid")}
          onClick={() => setLayout((value) => (value === "grid" ? "speaker" : "grid"))}
          disabled={hasScreenShare}
        >
          {layout === "grid" ? <PresentationIcon /> : <LayoutGridIcon />}
        </RoomButton>
        <RoomButton
          label={t("panel")}
          active={panelOpen}
          badge={room.isHost ? waiting.length : 0}
          onClick={() => setPanelOpen((value) => !value)}
        >
          <UsersIcon />
        </RoomButton>

        {agent && aiMode !== "silent" && (aiMode !== "conversational" || isGroup) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={askAi}
                disabled={asking}
                className="h-11 rounded-full bg-ai-gradient text-ai-foreground hover:opacity-90"
              >
                <SparklesIcon />
                {t("askAi")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("askAiHint")}</TooltipContent>
          </Tooltip>
        )}

        {room.isHost && (
          <CallHostMenu
            aiMode={aiMode}
            onAiModeChange={(mode) => {
              manualMode.current = true;
              setAiMode(mode);
            }}
          />
        )}

        <Button
          variant="secondary"
          className="h-11 rounded-full"
          onClick={() => void onLeave(false)}
        >
          <LogOutIcon />
          <span className="hidden sm:inline">{t("leave")}</span>
        </Button>
        {room.isHost && (
          <Button
            variant="destructive"
            className="h-11 rounded-full"
            disabled={endCall.isPending}
            onClick={async () => {
              if (await confirmEnd()) endCall.mutate({ id: room.meetingId });
            }}
          >
            <PhoneOffIcon />
            <span className="hidden sm:inline">{t("endForAll")}</span>
          </Button>
        )}
      </footer>
    </div>
  );
};

const RoomButton = ({
  label,
  active,
  badge,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="secondary"
        size="icon"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className={cn("relative size-11 rounded-full", active && "bg-primary text-primary-foreground hover:bg-primary/90")}
      >
        {children}
        {!!badge && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-stage">
            {badge}
          </span>
        )}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);
