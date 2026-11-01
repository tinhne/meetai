// Pure meeting analytics computed from transcript segments.

import { normalizeForSearch } from "@/lib/text";

const FILLER_WORDS: Record<string, string[]> = {
  vi: ["ờ", "ừm", "à", "ừ", "kiểu như", "thì là", "nói chung là", "đại loại"],
  en: ["um", "uh", "erm", "like", "you know", "i mean", "sort of", "kind of"],
};

export interface SpeakerStats {
  name: string;
  talkMs: number;
  words: number;
  turns: number;
  questions: number;
  fillers: number;
  share: number;
}

function countOccurrences(text: string, phrase: string) {
  const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const target = phrase.split(" ");
  let count = 0;
  for (let index = 0; index <= words.length - target.length; index++) {
    if (target.every((word, offset) => words[index + offset] === word)) count++;
  }
  return count;
}

export function computeMeetingAnalytics(
  segments: { speakerName: string; startMs: number; endMs: number; text: string }[],
  language: string,
) {
  const fillers = (FILLER_WORDS[language] ?? [...FILLER_WORDS.vi, ...FILLER_WORDS.en]).map(
    (word) => normalizeForSearch(word),
  );
  const bySpeaker = new Map<string, Omit<SpeakerStats, "share">>();
  let previousSpeaker: string | null = null;

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    const stats = bySpeaker.get(segment.speakerName) ?? {
      name: segment.speakerName,
      talkMs: 0,
      words: 0,
      turns: 0,
      questions: 0,
      fillers: 0,
    };
    const normalized = normalizeForSearch(text);

    stats.talkMs += Math.max(0, segment.endMs - segment.startMs);
    stats.words += text.split(/\s+/).filter(Boolean).length;
    stats.questions += (text.match(/\?/g) ?? []).length;
    stats.fillers += fillers.reduce(
      (total, filler) => total + countOccurrences(normalized, filler),
      0,
    );
    if (previousSpeaker !== segment.speakerName) stats.turns += 1;
    previousSpeaker = segment.speakerName;

    bySpeaker.set(segment.speakerName, stats);
  }

  const totalMs = [...bySpeaker.values()].reduce((total, stats) => total + stats.talkMs, 0);

  return [...bySpeaker.values()]
    .map((stats) => ({ ...stats, share: totalMs > 0 ? stats.talkMs / totalMs : 0 }))
    .sort((a, b) => b.talkMs - a.talkMs);
}

// "[12:34]" / "[1:02:03]" citations in AI answers, as milliseconds.
export function parseTimestamp(value: string) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
}
