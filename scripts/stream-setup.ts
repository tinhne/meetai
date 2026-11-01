// Creates or updates the "meetai" Stream call type with locked-down grants.
//
// On the built-in "default" call type every member may end the call, stop
// recording/transcription or remove other members from the client SDK. With
// guests in meetings that is not acceptable. In this app all host actions
// (end, mute, remove) run on the server with the admin key, so clients only
// need to join and publish media.
//
//   npx tsx scripts/stream-setup.ts           # dry run: print what would change
//   npx tsx scripts/stream-setup.ts --apply   # create/update the call type
//
// Then set STREAM_CALL_TYPE=meetai. Existing meetings keep their call type.
import "dotenv/config";

import { StreamClient } from "@stream-io/node-sdk";

const CALL_TYPE = "meetai";

const CLIENT_GRANTS = [
  "join-call",
  "read-call",
  "send-audio",
  "send-video",
  "screenshare",
  "create-call-reaction",
  "send-event",
  "enable-noise-cancellation-any-team",
];

const grants: Record<string, string[]> = {
  user: CLIENT_GRANTS,
  call_member: CLIENT_GRANTS,
  guest: CLIENT_GRANTS,
};

// Meetings override these per call (language, auto-on); the type only has to
// make the features available.
const settings = {
  transcription: { mode: "available" as const, closed_caption_mode: "available" as const },
  recording: { mode: "available" as const, quality: "720p" as const },
};

async function main() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
  const secret = process.env.STREAM_VIDEO_SECRET_KEY;
  if (!apiKey || !secret) throw new Error("Stream video credentials are missing");

  const apply = process.argv.includes("--apply");
  const client = new StreamClient(apiKey, secret);

  const existing = await client.video
    .getCallType({ name: CALL_TYPE })
    .catch(() => null);

  console.info(existing ? `Call type "${CALL_TYPE}" exists.` : `Call type "${CALL_TYPE}" does not exist yet.`);
  for (const [role, list] of Object.entries(grants)) {
    console.info(`  ${role}: ${list.join(", ")}`);
    const current = existing?.grants?.[role];
    if (current) {
      const removed = current.filter((grant) => !list.includes(grant));
      if (removed.length > 0) console.info(`    removes: ${removed.join(", ")}`);
    }
  }

  if (!apply) {
    console.info("\nDry run only. Re-run with --apply to make these changes.");
    return;
  }

  if (existing) {
    await client.video.updateCallType({ name: CALL_TYPE, grants, settings });
  } else {
    await client.video.createCallType({ name: CALL_TYPE, grants, settings });
  }
  console.info(`\nDone. Set STREAM_CALL_TYPE=${CALL_TYPE} for new meetings.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
