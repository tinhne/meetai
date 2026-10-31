import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { agents, meetingParticipants, meetings } from "@/db/schema";
import {
  hasMeetingRole,
  resolveMeetingRole,
  type MeetingRole,
} from "./authz-rules";

export async function getOwnedAgent(userId: string, agentId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

  if (!agent) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
  }

  return agent;
}

// Returns NOT_FOUND (not FORBIDDEN) so meeting ids cannot be probed.
export async function getMeetingForUser(
  userId: string,
  meetingId: string,
  minRole: MeetingRole = "participant",
) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
  }

  const [participant] =
    meeting.userId === userId
      ? []
      : await db
          .select({ role: meetingParticipants.role, status: meetingParticipants.status })
          .from(meetingParticipants)
          .where(
            and(
              eq(meetingParticipants.meetingId, meeting.id),
              eq(meetingParticipants.userId, userId),
            ),
          );

  const role = resolveMeetingRole(meeting, userId, participant);

  if (!hasMeetingRole(role, minRole)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
  }

  return { meeting, role: role as MeetingRole };
}
