// Personal invite link (/j/:code?invite=pass) sent by email: it lets that
// person skip the waiting room. It carries no email address, only a short
// hash of it, and stops working when the host regenerates the invite code.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(`invite:${payload}`).digest("base64url");
}

export function createInvitePass(params: {
  secret: string;
  meetingId: string;
  inviteCode: string;
  email: string;
}) {
  const recipient = createHash("sha256")
    .update(params.email.trim().toLowerCase())
    .digest("base64url")
    .slice(0, 10);
  return `${recipient}.${sign(params.secret, `${params.meetingId}.${params.inviteCode}.${recipient}`)}`;
}

export function verifyInvitePass(params: {
  secret: string;
  meetingId: string;
  inviteCode: string;
  pass: string | undefined | null;
}) {
  const parts = params.pass?.split(".") ?? [];
  if (parts.length !== 2) return false;

  const [recipient, signature] = parts;
  const expected = Buffer.from(
    sign(params.secret, `${params.meetingId}.${params.inviteCode}.${recipient}`),
  );
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
