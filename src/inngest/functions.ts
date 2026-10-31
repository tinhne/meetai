import { MediaResolution, ThinkingLevel } from "@google/genai";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import JSONL from "jsonl-parse-stringify";

import { AI_CONFIG, MEETING_TEMPLATES, type MeetingTemplate } from "@/config/ai";
import { db } from "@/db";
import {
  actionItems,
  agents,
  appRateLimits,
  meetings,
  transcriptSegments,
  user,
  webhookEvents,
} from "@/db/schema";
import { env, isStorageEnabled } from "@/env";
import { sendMeetingReadyEmail } from "@/lib/email";
import { warnIfNearQuota } from "@/server/billing/quota";
import { failKnowledgeDocument, processKnowledgeDocument } from "@/server/memory/knowledge";
import {
  extractMeetingMemories,
  findUnindexedMeetings,
  indexMeetingTranscript,
} from "@/server/memory/store";
import { streamVideo } from "@/lib/stream-video";
import {
  countHumanParticipants,
  toStreamTranscriptionLanguage,
} from "@/modules/meetings/lib/stream";
import {
  chunkBySize,
  formatTranscriptForPrompt,
  streamLinesToSegments,
  windowsForDuration,
  type StreamTranscriptLine,
} from "@/modules/meetings/lib/transcript";
import { gemini, generateJson, uploadFileFromUrl } from "@/server/ai/gemini";
import {
  correctionPrompt,
  freeTranscriptionPrompt,
  insightsPrompt,
  timelineTranscriptionPrompt,
} from "@/server/ai/prompts";
import {
  freeTranscriptionSchema,
  insightsSchema,
  segmentTextSchema,
} from "@/server/ai/schemas";
import { copyUrlToStorage, storageKeys } from "@/server/storage";
import { inngest } from "./client";

const CORRECTION_CHUNK = 150;
// Inngest step outputs are capped, so large data stays in the database.
const MAX_TRANSCRIPT_CHARS = 600_000;

const NO_SPEECH_SUMMARY: Record<string, string> = {
  vi: "### Không có nội dung\nKhông phát hiện lời nói nào trong cuộc họp này, nên chưa có gì để tóm tắt.",
  en: "### Nothing to summarize\nNo speech was detected in this meeting.",
};

function toTemplate(value: string): MeetingTemplate {
  return (MEETING_TEMPLATES as readonly string[]).includes(value)
    ? (value as MeetingTemplate)
    : "general";
}

async function loadMeeting(meetingId: string) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  return meeting ?? null;
}

async function loadSpeakerNames(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();

  const [userRows, agentRows] = await Promise.all([
    db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids)),
    db.select({ id: agents.id, name: agents.name }).from(agents).where(inArray(agents.id, ids)),
  ]);

  return new Map([...userRows, ...agentRows].map((row) => [row.id, row.name]));
}

async function loadSegments(meetingId: string) {
  return db
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(asc(transcriptSegments.position));
}

async function updateSegmentTexts(
  meetingId: string,
  updates: { position: number; text: string }[],
) {
  for (const batch of chunkBySize(updates, 25)) {
    await Promise.all(
      batch.map((update) =>
        db
          .update(transcriptSegments)
          .set({ textCorrected: update.text.trim() })
          .where(
            and(
              eq(transcriptSegments.meetingId, meetingId),
              eq(transcriptSegments.position, update.position),
            ),
          ),
      ),
    );
  }
}

export const meetingsProcessing = inngest.createFunction(
  {
    id: "meetings/processing",
    // Stay within Gemini free-tier rate limits.
    concurrency: { limit: 2 },
    retries: 3,
    onFailure: async ({ event, error }) => {
      const meetingId = event.data.event.data.meetingId;
      if (typeof meetingId !== "string") return;

      console.error("[processing] failed:", meetingId, error.message);
      await db
        .update(meetings)
        .set({
          status: "failed",
          failedReason: "We could not generate the summary for this meeting.",
        })
        .where(and(eq(meetings.id, meetingId), eq(meetings.status, "processing")));
    },
  },
  { event: "meetings/processing" },
  async ({ event, step }) => {
    const meetingId: string = event.data.meetingId;

    const meeting = await step.run("start", async () => {
      const [row] = await db
        .update(meetings)
        .set({
          processingAttempts: sql`${meetings.processingAttempts} + 1`,
          failedReason: null,
          processingStage: "waiting",
        })
        .where(and(eq(meetings.id, meetingId), eq(meetings.status, "processing")))
        .returning();
      return row ?? null;
    });

    if (!meeting) return { skipped: "meeting is not processing" };

    // 1. Stream transcript (gives us who spoke when).
    let transcriptUrl = meeting.transcriptUrl;
    if (!transcriptUrl) {
      const ready = await step.waitForEvent("wait-for-transcript", {
        event: "meetings/transcription.ready",
        match: "data.meetingId",
        timeout: "15m",
      });
      transcriptUrl =
        (ready?.data.transcriptUrl as string | undefined) ??
        (await step.run("reload-transcript-url", async () =>
          (await loadMeeting(meetingId))?.transcriptUrl ?? null,
        ));
    }

    const parsed = await step.run("parse-segments", async () => {
      if (!transcriptUrl) return { count: 0, durationMs: 0, speakers: [] as string[] };

      if (isStorageEnabled) {
        const key = await copyUrlToStorage({
          sourceUrl: transcriptUrl,
          key: storageKeys.transcript(meetingId),
          contentType: "application/x-ndjson",
        });
        await db.update(meetings).set({ transcriptKey: key }).where(eq(meetings.id, meetingId));
      }

      const raw = await fetch(transcriptUrl).then((res) => res.text());
      const lines = JSONL.parse<StreamTranscriptLine>(raw);
      const names = await loadSpeakerNames([
        ...new Set(lines.map((line) => line.speaker_id).filter(Boolean)),
      ]);
      const segments = streamLinesToSegments(lines, names, "Unknown speaker");

      await db
        .update(meetings)
        .set({ processingStage: "transcribing" })
        .where(eq(meetings.id, meetingId));
      await db.delete(transcriptSegments).where(eq(transcriptSegments.meetingId, meetingId));
      for (const batch of chunkBySize(segments, 500)) {
        await db.insert(transcriptSegments).values(
          batch.map((segment) => ({ ...segment, meetingId, source: "stream" as const })),
        );
      }

      return {
        count: segments.length,
        durationMs: Math.max(0, ...segments.map((segment) => segment.endMs)),
        speakers: [...new Set(segments.map((segment) => segment.speakerName))],
      };
    });

    // 2. Stream's speech-to-text does not support some languages (e.g.
    // Vietnamese), so Gemini re-transcribes the recording for those.
    const streamLanguage = toStreamTranscriptionLanguage(meeting.language);
    const needsAudioTranscription =
      meeting.language !== "auto" && streamLanguage !== meeting.language;

    if (needsAudioTranscription && meeting.recordingEnabled) {
      let recordingUrl = meeting.recordingUrl;
      if (!recordingUrl) {
        const ready = await step.waitForEvent("wait-for-recording", {
          event: "meetings/recording.ready",
          match: "data.meetingId",
          timeout: "30m",
        });
        recordingUrl =
          (ready?.data.recordingUrl as string | undefined) ??
          (await step.run("reload-recording-url", async () =>
            (await loadMeeting(meetingId))?.recordingUrl ?? null,
          ));
      }

      if (recordingUrl) {
        const file = await step.run("upload-recording-to-gemini", () =>
          uploadFileFromUrl({
            sourceUrl: recordingUrl,
            mimeType: "video/mp4",
            displayName: `meeting-${meetingId}`,
          }),
        );

        for (let attempt = 0; attempt < 40; attempt++) {
          const state = await step.run(`gemini-file-state-${attempt}`, async () => {
            const current = await gemini.files.get({ name: file.name });
            return current.state ?? "PROCESSING";
          });
          if (state === "ACTIVE") break;
          if (state === "FAILED") {
            throw new NonRetriableError("Gemini could not process the recording");
          }
          if (attempt === 39) throw new Error("Gemini file processing timed out");
          await step.sleep(`wait-gemini-file-${attempt}`, "15s");
        }

        const meetingDurationMs =
          meeting.startedAt && meeting.endedAt
            ? new Date(meeting.endedAt).getTime() - new Date(meeting.startedAt).getTime()
            : 0;
        const windows = windowsForDuration(
          Math.max(parsed.durationMs, meetingDurationMs) + 5_000,
          AI_CONFIG.transcription.windowSec * 1000,
        );

        for (const [index, window] of windows.entries()) {
          await step.run(`transcribe-window-${index}`, async () => {
            const videoPart = {
              fileData: { fileUri: file.uri, mimeType: file.mimeType },
              videoMetadata: {
                startOffset: `${Math.floor(window.startMs / 1000)}s`,
                endOffset: `${Math.ceil(window.endMs / 1000)}s`,
                fps: AI_CONFIG.transcription.videoFps,
              },
            };

            if (parsed.count > 0) {
              const segments = (await loadSegments(meetingId)).filter(
                (segment) =>
                  segment.startMs >= window.startMs && segment.startMs < window.endMs,
              );
              if (segments.length === 0) return { updated: 0 };

              const prompt = timelineTranscriptionPrompt({
                language: meeting.language,
                windowStartSec: Math.floor(window.startMs / 1000),
                windowEndSec: Math.ceil(window.endMs / 1000),
                timeline: segments
                  .map(
                    (segment) =>
                      `#${segment.position} ${(segment.startMs / 1000).toFixed(1)}s-${(segment.endMs / 1000).toFixed(1)}s ${segment.speakerName}`,
                  )
                  .join("\n"),
              });
              const result = await generateJson({
                schema: segmentTextSchema,
                system: prompt.system,
                parts: [videoPart, { text: prompt.user }],
                mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
                thinkingLevel: ThinkingLevel.LOW,
                maxOutputTokens: 32_000,
              });
              const known = new Set(segments.map((segment) => segment.position));
              const updates = result.segments
                .filter((item) => known.has(item.id))
                .map((item) => ({ position: item.id, text: item.text }));
              await updateSegmentTexts(meetingId, updates);
              return { updated: updates.length };
            }

            // No speaker timeline from Stream: transcribe and diarize freely.
            const owner = await db
              .select({ name: user.name })
              .from(user)
              .where(eq(user.id, meeting.userId));
            const agent = await db
              .select({ name: agents.name })
              .from(agents)
              .where(eq(agents.id, meeting.agentId));
            const prompt = freeTranscriptionPrompt({
              language: meeting.language,
              windowStartSec: Math.floor(window.startMs / 1000),
              windowEndSec: Math.ceil(window.endMs / 1000),
              speakers: [owner[0]?.name, agent[0]?.name ? `${agent[0].name} (AI)` : null].filter(
                (name): name is string => !!name,
              ),
            });
            const result = await generateJson({
              schema: freeTranscriptionSchema,
              system: prompt.system,
              parts: [videoPart, { text: prompt.user }],
              mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
              thinkingLevel: ThinkingLevel.LOW,
              maxOutputTokens: 32_000,
            });
            const rows = result.segments
              .filter((item) => item.text.trim().length > 0)
              .map((item, itemIndex) => ({
                meetingId,
                position: index * 100_000 + itemIndex,
                speakerId: null,
                speakerName: item.speaker,
                startMs: Math.round(item.startSec * 1000),
                endMs: Math.round(item.endSec * 1000),
                text: item.text.trim(),
                textCorrected: item.text.trim(),
                source: "gemini" as const,
              }));
            if (rows.length > 0) await db.insert(transcriptSegments).values(rows);
            return { inserted: rows.length };
          });
        }

        await step.run("delete-gemini-file", async () => {
          await gemini.files.delete({ name: file.name }).catch(() => undefined);
        });
      }
    } else if (parsed.count > 0) {
      // Supported language: Stream's text is decent, clean it up cheaply.
      const chunks = Math.ceil(parsed.count / CORRECTION_CHUNK);
      for (let index = 0; index < chunks; index++) {
        await step.run(`correct-chunk-${index}`, async () => {
          const segments = (await loadSegments(meetingId)).slice(
            index * CORRECTION_CHUNK,
            (index + 1) * CORRECTION_CHUNK,
          );
          const prompt = correctionPrompt({
            language: meeting.language,
            lines: segments
              .map((segment) => `#${segment.position} ${segment.speakerName}: ${segment.text}`)
              .join("\n"),
          });
          const result = await generateJson({
            schema: segmentTextSchema,
            system: prompt.system,
            parts: [{ text: prompt.user }],
            models: [AI_CONFIG.gemini.fastModel, AI_CONFIG.gemini.textModel],
            thinkingLevel: ThinkingLevel.LOW,
            maxOutputTokens: 16_000,
          });
          const known = new Set(segments.map((segment) => segment.position));
          await updateSegmentTexts(
            meetingId,
            result.segments
              .filter((item) => known.has(item.id))
              .map((item) => ({ position: item.id, text: item.text })),
          );
        });
      }
    }

    // 3. Structured insights + summary.
    const insights = await step.run("generate-insights", async () => {
      await db
        .update(meetings)
        .set({ processingStage: "summarizing" })
        .where(eq(meetings.id, meetingId));
      const segments = await loadSegments(meetingId);
      const transcript = formatTranscriptForPrompt(
        segments.map((segment) => ({
          speakerName: segment.speakerName,
          startMs: segment.startMs,
          text: segment.textCorrected ?? segment.text,
        })),
      );

      if (!transcript.trim()) {
        await db
          .update(meetings)
          .set({
            summary: NO_SPEECH_SUMMARY[meeting.language === "en" ? "en" : "vi"],
            insights: null,
          })
          .where(eq(meetings.id, meetingId));
        return { empty: true, actionItems: 0 };
      }

      const prompt = insightsPrompt({
        language: meeting.language,
        template: toTemplate(meeting.template),
        meetingName: meeting.name,
        agenda: meeting.agenda,
        transcript: transcript.slice(0, MAX_TRANSCRIPT_CHARS),
      });
      const result = await generateJson({
        schema: insightsSchema,
        system: prompt.system,
        parts: [{ text: prompt.user }],
        maxOutputTokens: 16_000,
      });

      await db.batch([
        db
          .update(meetings)
          .set({ insights: result, summary: result.summaryMarkdown })
          .where(eq(meetings.id, meetingId)),
        db.delete(actionItems).where(eq(actionItems.meetingId, meetingId)),
      ]);
      if (result.actionItems.length > 0) {
        await db.insert(actionItems).values(
          result.actionItems.map((item) => ({
            meetingId,
            text: item.text,
            owner: item.owner,
            dueDate: item.dueDate,
            sourceMs: item.sourceSec === null ? null : Math.round(item.sourceSec * 1000),
          })),
        );
      }

      return { empty: false, actionItems: result.actionItems.length };
    });

    await step.run("complete", async () => {
      await db
        .update(meetings)
        .set({ status: "completed", failedReason: null, processingStage: null })
        .where(and(eq(meetings.id, meetingId), eq(meetings.status, "processing")));
    });

    await step.run("notify-owner", async () => {
      const [owner] = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, meeting.userId));
      if (!owner) return;

      const localePrefix = meeting.language === "en" ? "/en" : "";
      await sendMeetingReadyEmail({
        to: owner.email,
        name: owner.name,
        meetingName: meeting.name,
        language: meeting.language,
        url: `${env.NEXT_PUBLIC_APP_URL}${localePrefix}/dashboard/meetings/${meetingId}`,
      });
    });

    // AI minutes were spent during the call; warn at 80% of the month's quota.
    await step.run("quota-warning", () => warnIfNearQuota(meeting.userId, ["aiVoice"]));

    // 4. Long-term memory: searchable transcript windows + learned facts.
    // Runs after the notes are delivered, so a failure here never blocks them.
    if (!insights.empty) {
      await step.run("index-transcript", () =>
        indexMeetingTranscript({ meetingId, userId: meeting.userId }),
      );

      await step.run("extract-memories", async () => {
        const [agent] = await db
          .select({ memoryEnabled: agents.memoryEnabled })
          .from(agents)
          .where(eq(agents.id, meeting.agentId));
        if (!agent?.memoryEnabled) return { skipped: "memory disabled" };

        const [row] = await db
          .select({ summary: meetings.summary })
          .from(meetings)
          .where(eq(meetings.id, meetingId));
        const segments = await loadSegments(meetingId);
        const transcript = formatTranscriptForPrompt(
          segments.map((segment) => ({
            speakerName: segment.speakerName,
            startMs: segment.startMs,
            text: segment.textCorrected ?? segment.text,
          })),
        );

        return extractMeetingMemories({
          meetingId,
          meetingName: meeting.name,
          language: meeting.language,
          userId: meeting.userId,
          agentId: meeting.agentId,
          summary: row?.summary ?? "",
          transcript: transcript.slice(0, MAX_TRANSCRIPT_CHARS),
        });
      });
    }

    return insights;
  },
);

// Copies the recording into private storage (when configured) so it outlives
// Stream's expiring URLs.
export const meetingsStoreRecording = inngest.createFunction(
  { id: "meetings/store-recording", concurrency: { limit: 2 }, retries: 3 },
  { event: "meetings/recording.ready" },
  async ({ event, step }) => {
    if (!isStorageEnabled) return { skipped: "storage not configured" };

    const meetingId: string = event.data.meetingId;
    const recordingUrl: string = event.data.recordingUrl;

    return step.run("copy-recording", async () => {
      const key = await copyUrlToStorage({
        sourceUrl: recordingUrl,
        key: storageKeys.recording(meetingId),
        contentType: "video/mp4",
      });
      await db.update(meetings).set({ recordingKey: key }).where(eq(meetings.id, meetingId));
      return { key };
    });
  },
);

// Ends the call once no human has been in the room for EMPTY_ROOM_TIMEOUT_MIN.
// Debounced per meeting, so quick leave/rejoin (page refresh, network blips)
// never ends the meeting.
export const meetingsEndIfEmpty = inngest.createFunction(
  {
    id: "meetings/end-if-empty",
    debounce: {
      key: "event.data.meetingId",
      period: `${env.EMPTY_ROOM_TIMEOUT_MIN}m`,
    },
  },
  { event: "meetings/participant.left" },
  async ({ event, step }) => {
    const meetingId: string = event.data.meetingId;

    await step.run("end-call-if-empty", async () => {
      const meeting = await loadMeeting(meetingId);

      if (!meeting || meeting.status !== "active") {
        return { ended: false, reason: "not-active" };
      }

      const call = streamVideo.video.call(meeting.callType, meetingId);
      const { call: callState } = await call.get();
      const participants = callState.session?.participants ?? [];

      if (countHumanParticipants(participants, [meeting.agentId]) > 0) {
        return { ended: false, reason: "humans-present" };
      }

      await call.end();
      return { ended: true };
    });
  },
);

// Every 10 minutes: retry meetings stuck in processing, fail the ones that
// never finish, re-check long-running calls and prune bookkeeping tables.
export const meetingsWatchdog = inngest.createFunction(
  { id: "meetings/watchdog" },
  { cron: "*/10 * * * *" },
  async ({ step }) => {
    const now = Date.now();

    const stuck = await step.run("find-stuck-meetings", async () => {
      const rows = await db
        .select({
          id: meetings.id,
          attempts: meetings.processingAttempts,
          endedAt: meetings.endedAt,
        })
        .from(meetings)
        .where(
          and(
            eq(meetings.status, "processing"),
            lt(meetings.endedAt, new Date(now - 20 * 60 * 1000)),
          ),
        );
      return rows;
    });

    const toRetry = stuck.filter((row) => row.attempts === 0);
    const toFail = stuck.filter(
      (row) =>
        row.attempts > 0 &&
        row.endedAt !== null &&
        new Date(row.endedAt).getTime() < now - 90 * 60 * 1000,
    );

    if (toRetry.length > 0) {
      await step.sendEvent(
        "retry-stuck-processing",
        toRetry.map((row) => ({
          id: `meeting-processing-${row.id}-watchdog`,
          name: "meetings/processing",
          data: { meetingId: row.id },
        })),
      );
    }

    if (toFail.length > 0) {
      await step.run("fail-timed-out", async () => {
        await db
          .update(meetings)
          .set({
            status: "failed",
            failedReason: "Processing took too long. Please try again.",
          })
          .where(
            and(
              inArray(
                meetings.id,
                toFail.map((row) => row.id),
              ),
              eq(meetings.status, "processing"),
            ),
          );
      });
    }

    const longCalls = await step.run("find-long-calls", async () =>
      db
        .select({ id: meetings.id })
        .from(meetings)
        .where(
          and(
            eq(meetings.status, "active"),
            lt(meetings.startedAt, new Date(now - 30 * 60 * 1000)),
          ),
        ),
    );

    if (longCalls.length > 0) {
      await step.sendEvent(
        "check-long-calls",
        longCalls.map((row) => ({
          name: "meetings/participant.left",
          data: { meetingId: row.id },
        })),
      );
    }

    await step.run("prune-bookkeeping", async () => {
      await db
        .delete(webhookEvents)
        .where(lt(webhookEvents.receivedAt, new Date(now - 7 * 24 * 60 * 60 * 1000)));
      await db
        .delete(appRateLimits)
        .where(lt(appRateLimits.windowStart, new Date(now - 24 * 60 * 60 * 1000)));
    });

    return {
      retried: toRetry.length,
      failed: toFail.length,
      checkedCalls: longCalls.length,
    };
  },
);

// Knowledge base ingestion: extract text (PDF via Gemini, web pages via a
// guarded fetch), chunk and embed. Throttled for the Gemini free tier.
export const knowledgeProcess = inngest.createFunction(
  {
    id: "knowledge/process",
    concurrency: { limit: 2 },
    throttle: { limit: 10, period: "1m" },
    retries: 3,
    onFailure: async ({ event, error }) => {
      const documentId = event.data.event.data.documentId as string;
      await failKnowledgeDocument(documentId, error.message);
    },
  },
  { event: "knowledge/document.created" },
  async ({ event, step }) => {
    const documentId: string = event.data.documentId;
    return step.run("ingest", () => processKnowledgeDocument(documentId));
  },
);

// Indexes a user's older completed meetings (before Phase 7) for search.
// Throttled for the Gemini free-tier embedding quota.
export const memoryBackfill = inngest.createFunction(
  {
    id: "memory/backfill",
    concurrency: { limit: 1, key: "event.data.userId" },
    throttle: { limit: 1, period: "1h", key: "event.data.userId" },
    retries: 2,
  },
  { event: "memory/backfill.requested" },
  async ({ event, step }) => {
    const userId: string = event.data.userId;
    const pending = await step.run("find-unindexed", () => findUnindexedMeetings(userId, 30));
    for (const meetingId of pending) {
      await step.run(`index-${meetingId}`, () => indexMeetingTranscript({ meetingId, userId }));
    }
    return { indexed: pending.length };
  },
);
