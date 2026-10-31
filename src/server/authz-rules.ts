// Pure authorization rules (no DB access) so they can be unit tested.

// owner: created the meeting (edit, delete, retry...)
// host: runs the call (admit, mute, remove, end, AI mode) — owner or co-host
// participant: admitted to the call
export type MeetingRole = "owner" | "host" | "participant";

const ROLE_RANK: Record<MeetingRole, number> = {
  participant: 1,
  host: 2,
  owner: 3,
};

export interface ParticipantAccess {
  role: "host" | "cohost" | "participant" | "guest";
  status: "waiting" | "admitted" | "denied" | "removed";
}

export function resolveMeetingRole(
  meeting: { userId: string },
  userId: string,
  participant?: ParticipantAccess | null,
): MeetingRole | null {
  if (meeting.userId === userId) return "owner";
  if (!participant || participant.status !== "admitted") return null;
  return participant.role === "host" || participant.role === "cohost"
    ? "host"
    : "participant";
}

export function hasMeetingRole(
  actual: MeetingRole | null,
  required: MeetingRole,
) {
  return actual !== null && ROLE_RANK[actual] >= ROLE_RANK[required];
}
