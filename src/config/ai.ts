// AI models and limits. Model ids come from env so they can change without
// code changes (Gemini aliases always point to the current free Flash models).

export const MEETING_TEMPLATES = [
  "general",
  "minutes",
  "standup",
  "sales",
  "interview",
  "lecture",
] as const;
export type MeetingTemplate = (typeof MEETING_TEMPLATES)[number];

export const REALTIME_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

export const AI_CONFIG = {
  gemini: {
    textModel: process.env.GEMINI_TEXT_MODEL || "gemini-flash-latest",
    fastModel: process.env.GEMINI_FAST_MODEL || "gemini-flash-lite-latest",
  },
  realtime: {
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini",
    defaultVoice: "alloy",
    // Keeps answers short and cost predictable.
    maxResponseOutputTokens: 400,
    // OpenAI bills ~20 output audio tokens per second of speech.
    outputAudioTokensPerSecond: 20,
  },
  transcription: {
    // Recording is re-transcribed by Gemini in windows of this length; short
    // windows keep every call well inside the serverless time limit.
    windowSec: 5 * 60,
    // Sample one video frame every 10s; the audio is what matters.
    videoFps: 0.1,
  },
  recordingQuality: "720p" as const,
  askAi: {
    maxQuestionChars: 2000,
    // Transcripts up to this size are sent in full as context.
    fullTranscriptChars: 120_000,
    historyMessages: 6,
  },
};
