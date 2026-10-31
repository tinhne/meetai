// Runs one AI voice agent inside a Stream call: connects OpenAI Realtime via
// Stream, applies the session config, meters usage, enforces the voice quota
// and reconnects (a few times) if the connection drops while the call is
// still live. Shared by the agent worker and the in-process dev fallback, so
// it must not import server-only modules.

import type { StreamClient } from "@stream-io/node-sdk";
import type { RealtimeClient } from "@stream-io/openai-realtime-api";

import { STREAM_CALL_TYPE } from "@/modules/meetings/lib/stream";
import {
  buildRealtimeSessionConfig,
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
  done: Promise<void>;
}

const QUOTA_MESSAGE: Record<string, string> = {
  vi: "Nói ngắn gọn với mọi người rằng bạn đã dùng hết số phút AI của tháng này và sẽ rời cuộc họp ngay bây giờ. Chào tạm biệt.",
  en: "Briefly tell everyone that the AI minutes for this month are used up and that you are leaving the meeting now. Say goodbye.",
};

export async function startAgentSession(
  options: AgentSessionOptions,
): Promise<AgentSessionHandle> {
  const log = options.log ?? (() => {});
  const call = options.streamVideo.video.call(STREAM_CALL_TYPE, options.meetingId);
  const sessionConfig = buildRealtimeSessionConfig(options.context);

  let client: RealtimeClient | null = null;
  let stopped = false;
  let reconnects = 0;
  let usedSeconds = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const stop = (reason: string) => {
    if (stopped) return;
    stopped = true;
    log(`[agent ${options.meetingId}] stopping: ${reason}`);
    if (pollTimer) clearInterval(pollTimer);
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

  const sayFarewellAndStop = () => {
    const language = options.context.language === "en" ? "en" : "vi";
    try {
      client?.realtime.send("response.create", {
        response: { instructions: QUOTA_MESSAGE[language] },
      });
    } catch {
      // ignore, we are leaving anyway
    }
    setTimeout(() => stop("voice quota reached"), FAREWELL_DELAY_MS);
  };

  const connect = async () => {
    client = await options.streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: options.openAiApiKey,
      agentUserId: options.agentId,
      model: options.model,
    });

    client.updateSession(
      sessionConfig as Parameters<RealtimeClient["updateSession"]>[0],
    );

    client.on("realtime.event", (envelope) => {
      const { source, event } = envelope as {
        source: string;
        event: { type: string; response?: { usage?: RealtimeUsage }; error?: { message?: string } };
      };
      if (source !== "server") return;

      if (event.type === "error") {
        log(`[agent ${options.meetingId}] realtime error: ${event.error?.message ?? "unknown"}`);
        return;
      }

      if (event.type !== "response.done") return;

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

  // Safety net in case the end-of-call webhook never reaches us.
  pollTimer = setInterval(() => {
    void isCallLive().then((live) => {
      if (!live) stop("call ended");
    });
  }, CALL_POLL_INTERVAL_MS);

  return { stop, done };
}
