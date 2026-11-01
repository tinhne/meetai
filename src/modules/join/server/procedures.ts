import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { db } from "@/db";
import { agents, meetingParticipants, meetings, user } from "@/db/schema";
import { env } from "@/env";
import { generateAvatar } from "@/lib/avatar";
import { streamVideo } from "@/lib/stream-video";
import { verifyInvitePass } from "@/modules/meetings/lib/invite-pass";
import { canEnterCall, canJoinMeeting } from "@/modules/meetings/lib/rules";
import {
  cleanGuestName,
  decideJoin,
  guestStreamUserId,
} from "@/modules/meetings/lib/participants";
import { streamCallCid } from "@/modules/meetings/lib/stream";
import { askAgentInMeeting } from "@/server/agent-dispatch";
import {
  getClientIp,
  readGuestSession,
  writeGuestSession,
} from "@/server/guest-session";
import { assertRoomForMore } from "@/server/participants";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { createTRPCRouter, optionalAuthProcedure } from "@/trpc/init";

const STREAM_TOKEN_TTL_SEC = 60 * 60;

type Session = Awaited<ReturnType<typeof import("@/lib/auth").auth.api.getSession>>;
type Participant = typeof meetingParticipants.$inferSelect;

async function getMeetingByCode(code: string) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.inviteCode, code));

  if (!meeting) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
  }
  return meeting;
}

// Who is looking at the join page: the owner, a signed-in user, a returning
// guest (signed cookie) or someone anonymous.
async function resolveViewer(meeting: typeof meetings.$inferSelect, session: Session) {
  if (session) {
    const [participant] = await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meeting.id),
          eq(meetingParticipants.userId, session.user.id),
        ),
      );

    return {
      kind: session.user.id === meeting.userId ? ("owner" as const) : ("user" as const),
      name: session.user.name,
      image: session.user.image ?? null,
      streamUserId: session.user.id,
      participant: (participant ?? null) as Participant | null,
    };
  }

  const guest = await readGuestSession();
  if (guest && guest.meetingId === meeting.id) {
    const [participant] = await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.id, guest.participantId),
          eq(meetingParticipants.meetingId, meeting.id),
        ),
      );
    if (participant) {
      return {
        kind: "guest" as const,
        name: participant.guestName ?? "Guest",
        image: null,
        streamUserId: participant.streamUserId,
        participant: participant as Participant | null,
      };
    }
  }

  return {
    kind: "anonymous" as const,
    name: null,
    image: null,
    streamUserId: null,
    participant: null as Participant | null,
  };
}

function viewerStatus(viewer: Awaited<ReturnType<typeof resolveViewer>>) {
  if (viewer.kind === "owner") return "admitted" as const;
  return viewer.participant?.status ?? null;
}

async function enforce(key: string, rule: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS]) {
  const result = await consumeRateLimit(key, rule);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many requests. Please try again in ${result.retryAfterSec}s.`,
    });
  }
}

const codeInput = z.object({ code: z.string().min(6).max(32) });

export const joinRouter = createTRPCRouter({
  getInfo: optionalAuthProcedure.input(codeInput).query(async ({ ctx, input }) => {
    const meeting = await getMeetingByCode(input.code);
    const viewer = await resolveViewer(meeting, ctx.session);

    const [[host], [agent]] = await Promise.all([
      db.select({ name: user.name }).from(user).where(eq(user.id, meeting.userId)),
      db.select({ name: agents.name }).from(agents).where(eq(agents.id, meeting.agentId)),
    ]);

    return {
      meetingName: meeting.name,
      hostName: host?.name ?? null,
      agentName: agent?.name ?? null,
      scheduledAt: meeting.scheduledAt,
      status: meeting.status,
      joinable: canJoinMeeting(meeting.status),
      started: meeting.status === "active",
      locked: meeting.joinMode === "locked",
      viewer: {
        kind: viewer.kind,
        name: viewer.name,
        status: viewerStatus(viewer),
      },
    };
  }),

  // Ask to join (or join directly when the room is open). Guests send a name.
  request: optionalAuthProcedure
    .input(
      codeInput.extend({
        guestName: z.string().max(100).optional(),
        consent: z.literal(true),
        invite: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const meeting = await getMeetingByCode(input.code);
      await enforce(
        `join:${ctx.session?.user.id ?? (await getClientIp())}`,
        RATE_LIMITS.joinRequest,
      );

      if (!canJoinMeeting(meeting.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This meeting can no longer be joined.",
        });
      }

      const viewer = await resolveViewer(meeting, ctx.session);
      const now = new Date();

      if (viewer.kind === "owner") return { status: "admitted" as const };

      // Returning people keep their decision (denied/removed stay out).
      if (viewer.participant) {
        if (viewer.participant.status === "waiting" || viewer.participant.status === "admitted") {
          await db
            .update(meetingParticipants)
            .set({ consentAt: now })
            .where(eq(meetingParticipants.id, viewer.participant.id));
        }
        return { status: viewer.participant.status };
      }

      const decision = decideJoin({
        joinMode: meeting.joinMode,
        isOwner: false,
        invited: verifyInvitePass({
          secret: env.BETTER_AUTH_SECRET,
          meetingId: meeting.id,
          inviteCode: meeting.inviteCode,
          pass: input.invite,
        }),
      });
      if (decision === "locked") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The host has locked this meeting.",
        });
      }
      if (decision === "admitted") await assertRoomForMore(meeting);

      if (viewer.kind === "user") {
        await db.insert(meetingParticipants).values({
          meetingId: meeting.id,
          userId: viewer.streamUserId,
          streamUserId: viewer.streamUserId,
          role: "participant",
          status: decision,
          consentAt: now,
        });
        return { status: decision };
      }

      const guestName = cleanGuestName(input.guestName ?? "");
      if (guestName.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter your name." });
      }

      const participantId = nanoid();
      await db.insert(meetingParticipants).values({
        id: participantId,
        meetingId: meeting.id,
        guestName,
        streamUserId: guestStreamUserId(participantId),
        role: "guest",
        status: decision,
        consentAt: now,
      });
      await writeGuestSession(participantId, meeting.id);

      return { status: decision };
    }),

  status: optionalAuthProcedure.input(codeInput).query(async ({ ctx, input }) => {
    const meeting = await getMeetingByCode(input.code);
    const viewer = await resolveViewer(meeting, ctx.session);
    return {
      status: viewerStatus(viewer),
      meetingStatus: meeting.status,
      started: meeting.status === "active",
    };
  }),

  // Call token scoped to this meeting's call, only for admitted people.
  token: optionalAuthProcedure.input(codeInput).mutation(async ({ ctx, input }) => {
    const meeting = await getMeetingByCode(input.code);
    const viewer = await resolveViewer(meeting, ctx.session);

    if (viewerStatus(viewer) !== "admitted" || !viewer.streamUserId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not admitted yet." });
    }
    if (!canJoinMeeting(meeting.status)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This meeting can no longer be joined.",
      });
    }
    const isHost =
      viewer.kind === "owner" ||
      viewer.participant?.role === "host" ||
      viewer.participant?.role === "cohost";
    if (!canEnterCall(meeting.status, isHost)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The host has not started the meeting yet.",
      });
    }

    await enforce(`streamToken:${viewer.streamUserId}`, RATE_LIMITS.streamToken);

    const name = viewer.name ?? "Guest";
    const image = viewer.image ?? generateAvatar(name, "initials");

    await streamVideo.upsertUsers([
      { id: viewer.streamUserId, name, image, role: "user" },
    ]);

    const issuedAt = Math.floor(Date.now() / 1000) - 60;
    const token = streamVideo.generateCallToken({
      user_id: viewer.streamUserId,
      call_cids: [streamCallCid(meeting.callType, meeting.id)],
      iat: issuedAt,
      exp: issuedAt + 60 + STREAM_TOKEN_TTL_SEC,
    });

    return {
      token,
      meetingId: meeting.id,
      callType: meeting.callType,
      agentId: meeting.agentId,
      language: meeting.language,
      aiMode: meeting.aiMode,
      joinMode: meeting.joinMode,
      user: { id: viewer.streamUserId, name, image },
      isHost,
    };
  }),

  // "Ask AI" button for anyone admitted, including guests.
  askAgent: optionalAuthProcedure.input(codeInput).mutation(async ({ ctx, input }) => {
    const meeting = await getMeetingByCode(input.code);
    const viewer = await resolveViewer(meeting, ctx.session);

    if (viewerStatus(viewer) !== "admitted" || meeting.status !== "active") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not in this meeting." });
    }

    await enforce(`askAgent:${viewer.streamUserId}`, RATE_LIMITS.askAgent);
    await askAgentInMeeting(meeting.id, viewer.name ?? "Guest");

    return { ok: true };
  }),
});
