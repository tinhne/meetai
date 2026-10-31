import "server-only";

import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { meetingParticipants } from "@/db/schema";
import { hasRoomForMore } from "@/modules/meetings/lib/participants";
import { getUserPlan } from "@/modules/premium/server/usage";

// Throws when admitting one more person would exceed the owner's plan.
export async function assertRoomForMore(meeting: { id: string; userId: string }) {
  const [plan, [admitted]] = await Promise.all([
    getUserPlan(meeting.userId),
    db
      .select({ count: count() })
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meeting.id),
          eq(meetingParticipants.status, "admitted"),
        ),
      ),
  ]);

  if (!hasRoomForMore(admitted?.count ?? 0, plan.maxParticipants)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This meeting is full (${plan.maxParticipants} people on the current plan).`,
    });
  }
}

export function participantDisplayName(row: {
  guestName: string | null;
  userName: string | null;
}) {
  return row.userName ?? row.guestName ?? "Guest";
}
