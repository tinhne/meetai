import "server-only";

import { cookies, headers } from "next/headers";

import { env } from "@/env";
import {
  GUEST_COOKIE,
  GUEST_TOKEN_TTL_MS,
  createGuestToken,
  verifyGuestToken,
} from "@/modules/meetings/lib/guest-token";

export async function readGuestSession() {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return verifyGuestToken({ secret: env.BETTER_AUTH_SECRET, token });
}

export async function writeGuestSession(participantId: string, meetingId: string) {
  (await cookies()).set(
    GUEST_COOKIE,
    createGuestToken({ secret: env.BETTER_AUTH_SECRET, participantId, meetingId }),
    {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_TOKEN_TTL_MS / 1000,
    },
  );
}

// Best-effort client IP for rate limiting anonymous requests.
export async function getClientIp() {
  const list = await headers();
  return (
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown"
  );
}
