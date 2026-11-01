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

export const AI_MODES = [
  // Talks naturally, best for 1:1 practice.
  "conversational",
  // Only answers when called by name or via the "Ask AI" button.
  "on_demand",
  // On-demand plus periodic time checks against the agenda.
  "facilitator",
  // Never joins with voice; notes only.
  "silent",
] as const;
export type AiMode = (typeof AI_MODES)[number];

export const JOIN_MODES = ["approval", "open", "locked"] as const;
export type JoinMode = (typeof JOIN_MODES)[number];

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
    // Free tier; 768 dims keeps pgvector indexes small (see EMBEDDING_DIMENSIONS).
    embedModel: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
    embedBatchSize: 50,
  },
  memory: {
    // Cosine similarity above which a new memory updates an existing one.
    dedupeSimilarity: 0.92,
    maxPerMeeting: 12,
    // Memories / open action items put into the agent's instructions.
    briefingMemories: 15,
    briefingActionItems: 8,
    briefingMaxChars: 3_000,
  },
  knowledge: {
    // Vercel caps request bodies at 4.5 MB.
    maxFileBytes: 4 * 1024 * 1024,
    maxContentChars: 200_000,
    chunkChars: 2_000,
    chunkOverlapChars: 250,
  },
  search: {
    meetingChunkChars: 1_200,
    topK: 8,
  },
  realtime: {
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini",
    defaultVoice: "alloy",
    // Keeps answers short and cost predictable.
    maxResponseOutputTokens: 400,
    // OpenAI bills ~20 output audio tokens per second of speech.
    outputAudioTokensPerSecond: 20,
    // Group modes transcribe what people say to detect the agent's name.
    inputTranscriptionModel: "gpt-4o-mini-transcribe",
    // Keep the conversation context small in long group meetings (cost).
    maxConversationItems: 40,
    addressCooldownMs: 8_000,
    facilitatorCheckInMinutes: 15,
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
