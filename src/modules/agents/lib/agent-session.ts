// Runs one AI voice agent inside a Stream call: connects OpenAI Realtime via
// Stream, applies the session config, meters usage, enforces the voice quota
// and reconnects (a few times) if the connection drops while the call is
// still live. Shared by the agent worker and the in-process dev fallback, so
// it must not import server-only modules.

import type { StreamClient } from "@stream-io/node-sdk";
import type { RealtimeClient } from "@stream-io/openai-realtime-api";

import { AI_CONFIG, type AiMode } from "@/config/ai";
import {
  buildRealtimeSessionConfig,
  isAgentAddressed,
  voiceSecondsFromUsage,
  type RealtimeAgentContext,
  type RealtimeUsage,
} from "./realtime";

const CALL_POLL_INTERVAL_MS = 30_000;
const MAX_RECONNECTS = 3;
const FAREWELL_DELAY_MS = 8_000;

export interface AgentUsage {
  voiceSeconds: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AgentSessionOptions {
  streamVideo: StreamClient;
  callType: string;
  openAiApiKey: string;
  model: string;
  meetingId: string;
  agentId: string;
  context: RealtimeAgentContext;
  voiceSecondsRemaining: number;
  onUsage: (usage: AgentUsage) => Promise<void>;
  log?: (message: string) => void;
}

export interface AgentSessionHandle {
  stop: (reason: string) => void;
  // Group modes: answer the latest question now ("Ask AI" button).
  ask: (askedBy: string) => void;
  setMode: (mode: AiMode) => void;
  done: Promise<void>;
}

const ASK_MESSAGE: Record<string, (name: string) => string> = {
  vi: (name) => `${name} vừa bấm nút hỏi bạn. Hãy trả lời ngắn gọn câu hỏi gần nhất trong cuộc họp.`,
  en: (name) => `${name} pressed the button to ask you. Briefly answer the latest question in the meeting.`,
};

const ADDRESSED_MESSAGE: Record<string, string> = {
  vi: "Ai đó vừa gọi tên bạn. Hãy trả lời ngắn gọn điều họ vừa hỏi hoặc nhờ.",
  en: "Someone just addressed you by name. Briefly answer what they asked.",
};

const TIME_CHECK_MESSAGE: Record<string, (minutes: number) => string> = {
  vi: (minutes) => `Đã ${minutes} phút trôi qua. Nhắc giờ thật ngắn: những gì đã bàn và những mục agenda còn lại. Tối đa 2 câu.`,
  en: (minutes) => `${minutes} minutes have passed. Give a very short time check: what was covered and what agenda items remain. Two sentences max.`,
};

const QUOTA_MESSAGE: Record<string, string> = {
  vi: "Nói ngắn gọn với mọi người rằng bạn đã dùng hết số phút AI của tháng này và sẽ rời cuộc họp ngay bây giờ. Chào tạm biệt.",
  en: "Briefly tell everyone that the AI minutes for this month are used up and that you are leaving the meeting now. Say goodbye.",
};

export async function startAgentSession(
  options: AgentSessionOptions,
): Promise<AgentSessionHandle> {
  const log = options.log ?? (() => {});
  const call = options.streamVideo.video.call(options.callType, options.meetingId);
  const context = { ...options.context };
  const language = context.language === "en" ? "en" : "vi";
  const startedAt = Date.now();

  let client: RealtimeClient | null = null;
  let stopped = false;
  let reconnects = 0;
  let usedSeconds = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let facilitatorTimer: ReturnType<typeof setInterval> | null = null;
  let responding = false;
  let lastTriggeredAt = 0;
  // Conversation items kept in context; older ones are deleted to bound cost.
  const itemIds: string[] = [];
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const stop = (reason: string) => {
    if (stopped) return;
    stopped = true;
    log(`[agent ${options.meetingId}] stopping: ${reason}`);
    if (pollTimer) clearInterval(pollTimer);
    if (facilitatorTimer) clearInterval(facilitatorTimer);
    try {
      client?.disconnect();
    } catch {
      // already disconnected
    }
    resolveDone();
  };

  const isCallLive = async () => {
    try {
      const { call: state } = await call.get();
      return Boolean(state.session && !state.session.ended_at);
    } catch {
      return false;
    }
  };

  const respond = (instructions: string, force = false) => {
    if (!client || stopped) return;
    if (!force && (responding || Date.now() - lastTriggeredAt < AI_CONFIG.realtime.addressCooldownMs)) {
      return;
    }
    lastTriggeredAt = Date.now();
    client.realtime.send("response.create", { response: { instructions } });
  };

  const sayFarewellAndStop = () => {
    try {
      respond(QUOTA_MESSAGE[language], true);
    } catch {
      // ignore, we are leaving anyway
    }
    setTimeout(() => stop("voice quota reached"), FAREWELL_DELAY_MS);
  };

  const applySession = () => {
    client?.updateSession(
      buildRealtimeSessionConfig(context) as Parameters<RealtimeClient["updateSession"]>[0],
    );
  };

  const scheduleFacilitator = () => {
    if (facilitatorTimer) clearInterval(facilitatorTimer);
    facilitatorTimer = null;
    if (context.mode !== "facilitator") return;

    const intervalMs = AI_CONFIG.realtime.facilitatorCheckInMinutes * 60_000;
    facilitatorTimer = setInterval(() => {
      const minutes = Math.round((Date.now() - startedAt) / 60_000);
      respond(TIME_CHECK_MESSAGE[language](minutes), true);
    }, intervalMs);
  };

  const trackItem = (id: string | undefined) => {
    if (!id || itemIds.includes(id)) return;
    itemIds.push(id);
    while (itemIds.length > AI_CONFIG.realtime.maxConversationItems) {
      const oldest = itemIds.shift();
      try {
        if (oldest) client?.deleteItem(oldest);
      } catch {
        // item already gone
      }
    }
  };

  const connect = async () => {
    client = await options.streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: options.openAiApiKey,
      agentUserId: options.agentId,
      model: options.model,
    });

    itemIds.length = 0;
    applySession();

    client.on("realtime.event", (envelope) => {
      const { source, event } = envelope as {
        source: string;
        event: {
          type: string;
          item?: { id?: string };
          transcript?: string;
          response?: { usage?: RealtimeUsage };
          error?: { message?: string };
        };
      };
      if (source !== "server") return;

      switch (event.type) {
        case "error":
          log(`[agent ${options.meetingId}] realtime error: ${event.error?.message ?? "unknown"}`);
          return;
        case "conversation.item.created":
        case "conversation.item.added":
          trackItem(event.item?.id);
          return;
        case "response.created":
          responding = true;
          return;
        case "conversation.item.input_audio_transcription.completed":
          if (
            context.mode !== "conversational" &&
            event.transcript &&
            isAgentAddressed(event.transcript, context.agentName)
          ) {
            respond(ADDRESSED_MESSAGE[language]);
          }
          return;
        case "response.done":
          responding = false;
          break;
        default:
          return;
      }

      const usage = event.response?.usage;
      const voiceSeconds = voiceSecondsFromUsage(usage);
      usedSeconds += voiceSeconds;

      options
        .onUsage({
          voiceSeconds,
          inputTokens: usage?.input_tokens ?? 0,
          outputTokens: usage?.output_tokens ?? 0,
        })
        .catch((error: unknown) =>
          log(`[agent ${options.meetingId}] failed to record usage: ${String(error)}`),
        );

      if (usedSeconds >= options.voiceSecondsRemaining) {
        sayFarewellAndStop();
      }
    });

    client.on("close", () => {
      if (stopped) return;
      void handleDisconnect();
    });

    log(`[agent ${options.meetingId}] connected (${options.model})`);
  };

  const handleDisconnect = async () => {
    if (stopped) return;
    if (reconnects >= MAX_RECONNECTS || !(await isCallLive())) {
      stop("connection closed");
      return;
    }
    reconnects += 1;
    log(`[agent ${options.meetingId}] reconnecting (${reconnects}/${MAX_RECONNECTS})`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** reconnects));
    try {
      await connect();
    } catch (error) {
      log(`[agent ${options.meetingId}] reconnect failed: ${String(error)}`);
      void handleDisconnect();
    }
  };

  await connect();
  scheduleFacilitator();

  // Safety net in case the end-of-call webhook never reaches us.
  pollTimer = setInterval(() => {
    void isCallLive().then((live) => {
      if (!live) stop("call ended");
    });
  }, CALL_POLL_INTERVAL_MS);

  const ask = (askedBy: string) => {
    respond(ASK_MESSAGE[language](askedBy), true);
  };

  const setMode = (mode: AiMode) => {
    if (mode === "silent") {
      stop("AI turned off by host");
      return;
    }
    context.mode = mode;
    applySession();
    scheduleFacilitator();
  };

  return { stop, ask, setMode, done };
}
