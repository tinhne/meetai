// Pure business rules for meetings (unit tested, no DB access).

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
