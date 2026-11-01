// Signed guest session (cookie value) so people without an account can
// rejoin the same meeting. Format: participantId.meetingId.expiry.signature

import { createHmac, timingSafeEqual } from "node:crypto";

export const GUEST_COOKIE = "meetai_guest";
export const GUEST_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(`guest:${payload}`).digest("base64url");
}

export function createGuestToken(params: {
  secret: string;
  participantId: string;
  meetingId: string;
  now?: number;
}) {
  const expiresAt = (params.now ?? Date.now()) + GUEST_TOKEN_TTL_MS;
  const payload = `${params.participantId}.${params.meetingId}.${expiresAt}`;
  return `${payload}.${sign(params.secret, payload)}`;
}

export function verifyGuestToken(params: {
  secret: string;
  token: string | undefined | null;
  now?: number;
}) {
  const parts = params.token?.split(".") ?? [];
  if (parts.length !== 4) return null;

  const [participantId, meetingId, expiresAt, signature] = parts;
  const payload = `${participantId}.${meetingId}.${expiresAt}`;
  const expected = Buffer.from(sign(params.secret, payload));
  const received = Buffer.from(signature);

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }
  if (Number(expiresAt) < (params.now ?? Date.now())) return null;

  return { participantId, meetingId };
}
