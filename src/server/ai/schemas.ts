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

// Practice mode report. Scores are estimates for practice, never official.
export const scorecardSchema = z.object({
  // "band9" = IELTS band 0–9 (0.5 steps), "ten" = score out of 10.
  scale: z.enum(["band9", "ten"]),
  overall: z.number().min(0).max(10),
  criteria: z
    .array(
      z.object({
        name: z.string().max(80),
        score: z.number().min(0).max(10),
        comment: z.string().max(500),
      }),
    )
    .max(6),
  strengths: z.array(z.string().max(300)).max(5),
  improvements: z.array(z.string().max(300)).max(5),
  betterAnswers: z
    .array(
      z.object({
        question: z.string().max(300),
        original: z.string().max(600),
        improved: z.string().max(800),
      }),
    )
    .max(3),
  summary: z.string().max(800),
});
export type Scorecard = z.infer<typeof scorecardSchema>;
