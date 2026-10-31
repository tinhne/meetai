import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
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

  const role = meeting ? resolveMeetingRole(meeting, userId) : null;

  if (!meeting || !hasMeetingRole(role, minRole)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
  }

  return { meeting, role: role as MeetingRole };
}
