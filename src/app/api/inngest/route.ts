import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  meetingsEndIfEmpty,
  meetingsProcessing,
  meetingsStoreRecording,
  meetingsWatchdog,
} from "@/inngest/functions";

// Long steps (uploading recordings to Gemini / R2) need more than the default.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    meetingsProcessing,
    meetingsStoreRecording,
    meetingsEndIfEmpty,
    meetingsWatchdog,
  ],
});
