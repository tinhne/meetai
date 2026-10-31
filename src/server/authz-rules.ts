// Pure authorization rules (no DB access) so they can be unit tested.

export type MeetingRole = "host" | "participant";

const ROLE_RANK: Record<MeetingRole, number> = {
  participant: 1,
  host: 2,
};

export function resolveMeetingRole(
  meeting: { userId: string },
  userId: string,
): MeetingRole | null {
  // Only the owner has access until invites/participants exist.
  return meeting.userId === userId ? "host" : null;
}

export function hasMeetingRole(
  actual: MeetingRole | null,
  required: MeetingRole,
) {
  return actual !== null && ROLE_RANK[actual] >= ROLE_RANK[required];
}
