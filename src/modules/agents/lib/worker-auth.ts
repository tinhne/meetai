// HMAC signing for app -> agent worker requests (shared by both sides).

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60 * 1000;

export function signWorkerRequest(secret: string, body: string, timestamp: number) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifyWorkerRequest(params: {
  secret: string;
  body: string;
  timestamp: string | null;
  signature: string | null;
  now?: number;
}) {
  const timestamp = Number(params.timestamp);
  if (!params.signature || !Number.isFinite(timestamp)) return false;
  if (Math.abs((params.now ?? Date.now()) - timestamp) > MAX_SKEW_MS) return false;

  const expected = Buffer.from(
    signWorkerRequest(params.secret, params.body, timestamp),
    "hex",
  );
  const received = Buffer.from(params.signature, "hex");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
