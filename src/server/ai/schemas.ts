import { z } from "zod";

// Text for existing timeline segments (re-transcription / correction).
export const segmentTextSchema = z.object({
  segments: z.array(
    z.object({
      id: z.number().int(),
      text: z.string(),
    }),
  ),
});

// Free transcription when no speaker timeline is available.
export const freeTranscriptionSchema = z.object({
  segments: z.array(
    z.object({
      speaker: z.string(),
      startSec: z.number(),
      endSec: z.number(),
      text: z.string(),
    }),
  ),
});

const sourced = z.object({
  text: z.string(),
  sourceSec: z.number().nullable(),
});

export const insightsSchema = z.object({
  title: z.string(),
  tldr: z.string(),
  chapters: z.array(
    z.object({
      title: z.string(),
      startSec: z.number(),
      bullets: z.array(z.string()),
    }),
  ),
  decisions: z.array(sourced),
  actionItems: z.array(
    sourced.extend({
      owner: z.string().nullable(),
      dueDate: z.string().nullable(),
    }),
  ),
  openQuestions: z.array(sourced),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  keyTerms: z.array(z.string()),
  // Human readable summary following the meeting template.
  summaryMarkdown: z.string(),
});

export type MeetingInsights = z.infer<typeof insightsSchema>;
