// Pure business rules for meetings (unit tested, no DB access).

import type { AiMode } from "@/config/ai";

type MeetingStatusValue =
  | "upcoming"
  | "active"
  | "completed"
  | "processing"
  | "cancelled"
  | "failed";

export interface MeetingUpdateInput {
  name: string;
  agentId: string;
  language: string;
  template: string;
  aiMode: string;
  agenda?: string;
  scheduledAt?: string;
}

interface CurrentMeeting {
  status: MeetingStatusValue;
  agentId: string;
  language: string;
}

export type MeetingUpdatePlan =
  | {
      ok: true;
      changes: {
        name: string;
        agentId: string;
        language: string;
        template: string;
        aiMode: string;
        agenda: string | null;
        scheduledAt: Date | null;
        updatedAt: Date;
      };
      agentChanged: boolean;
      languageChanged: boolean;
    }
  | { ok: false; reason: string };

// Only whitelisted fields can change. Agent and language are locked once the
// meeting has started because the Stream call is already configured.
export function planMeetingUpdate(
  current: CurrentMeeting,
  input: MeetingUpdateInput,
  now: Date = new Date(),
): MeetingUpdatePlan {
  const agentChanged = current.agentId !== input.agentId;
  const languageChanged = current.language !== input.language;

  if (current.status !== "upcoming" && (agentChanged || languageChanged)) {
    return {
      ok: false,
      reason: "The agent and language can only be changed before the meeting starts.",
    };
  }

  return {
    ok: true,
    agentChanged,
    languageChanged,
    changes: {
      name: input.name,
      agentId: input.agentId,
      language: input.language,
      template: input.template,
      aiMode: input.aiMode,
      agenda: input.agenda ? input.agenda : null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      updatedAt: now,
    },
  };
}

export function canJoinMeeting(status: MeetingStatusValue) {
  return status === "upcoming" || status === "active";
}

// Only the host (or a co-host) starts a meeting. Everyone else waits until it
// is active, so the AI and the recording never run before the host arrives.
export function canEnterCall(status: MeetingStatusValue, isHost: boolean) {
  return isHost ? canJoinMeeting(status) : status === "active";
}

// A 1-1 AI conversation turns into "answer when called" as soon as a second
// person is in the room, and back once they leave (only if it was switched
// automatically; a mode the host picked is kept). Returns null for no change.
export function nextAutoAiMode(params: {
  mode: AiMode;
  people: number;
  autoSwitched: boolean;
}): AiMode | null {
  if (params.people >= 2 && params.mode === "conversational") return "on_demand";
  if (params.people < 2 && params.mode === "on_demand" && params.autoSwitched) {
    return "conversational";
  }
  return null;
}
