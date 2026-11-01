// Pure transcript helpers shared by the processing pipeline and Ask AI.

import { normalizeForSearch } from "@/lib/text";
import { formatTimestamp } from "@/lib/utils";

export { normalizeForSearch };

export interface StreamTranscriptLine {
  speaker_id: string;
  type?: string;
  text: string;
  start_ts: number;
  // Stream calls the end of an utterance "stop_ts".
  stop_ts: number;
}

export interface Segment {
  position: number;
  speakerId: string | null;
  speakerName: string;
  startMs: number;
  endMs: number;
  text: string;
}

export function streamLinesToSegments(
  lines: StreamTranscriptLine[],
  speakerNames: Map<string, string>,
  unknownSpeaker: string,
): Segment[] {
  return lines
    .filter((line) => line.type === undefined || line.type === "speech")
    .filter((line) => typeof line.text === "string")
    .sort((a, b) => a.start_ts - b.start_ts)
    .map((line, position) => {
      const startMs = toMs(line.start_ts);
      return {
        position,
        speakerId: line.speaker_id ?? null,
        speakerName: speakerNames.get(line.speaker_id) ?? unknownSpeaker,
        startMs,
        endMs: Math.max(startMs, toMs(line.stop_ts)),
        text: line.text.trim(),
      };
    });
}

// A missing or malformed timestamp must never become NaN (int columns reject it).
function toMs(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

// Compact prompt format: "[m:ss] Name: text" (much cheaper than raw JSON).
export function formatTranscriptForPrompt(
  segments: Pick<Segment, "speakerName" | "startMs" | "text">[],
) {
  return segments
    .filter((segment) => segment.text.trim().length > 0)
    .map(
      (segment) =>
        `[${formatTimestamp(segment.startMs)}] ${segment.speakerName}: ${segment.text}`,
    )
    .join("\n");
}

export function windowsForDuration(durationMs: number, windowMs: number) {
  const windows: { startMs: number; endMs: number }[] = [];
  for (let start = 0; start < durationMs; start += windowMs) {
    windows.push({ startMs: start, endMs: Math.min(durationMs, start + windowMs) });
  }
  return windows;
}

export function chunkBySize<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}


const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "was", "what",
  "who", "when", "how", "did", "do", "we", "i", "you", "it", "that", "this",
  "la", "va", "cua", "co", "khong", "gi", "nao", "the", "nhu", "duoc", "cho",
  "trong", "voi", "mot", "nhung", "da", "se", "thi", "ai", "toi", "ban",
]);

// Picks the segments most related to a question (plus their neighbours) when
// the full transcript is too large to send as context.
export function selectRelevantSegments<T extends { text: string }>(
  segments: T[],
  question: string,
  maxSegments: number,
) {
  const terms = normalizeForSearch(question)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));

  if (terms.length === 0) return segments.slice(0, maxSegments);

  const scored = segments.map((segment, index) => {
    const text = normalizeForSearch(segment.text);
    const score = terms.reduce(
      (total, term) => total + (text.includes(term) ? 1 : 0),
      0,
    );
    return { index, score };
  });

  const picked = new Set<number>();
  for (const { index } of scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)) {
    for (const neighbour of [index - 1, index, index + 1]) {
      if (neighbour >= 0 && neighbour < segments.length) picked.add(neighbour);
    }
    if (picked.size >= maxSegments) break;
  }

  return [...picked].sort((a, b) => a - b).map((index) => segments[index]);
}
