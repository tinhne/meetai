// Pure helpers shared by meeting procedures, the Stream webhook and jobs.

// Call type of meetings created before the call type became configurable.
export const DEFAULT_STREAM_CALL_TYPE = "default";

export const MEETING_LANGUAGES = ["vi", "en", "auto"] as const;
export type MeetingLanguage = (typeof MEETING_LANGUAGES)[number];

// Spoken languages accepted by Stream transcription (node-sdk 0.4.x types).
// Vietnamese is NOT supported by Stream's speech-to-text.
const STREAM_TRANSCRIPTION_LANGUAGES = [
  "auto", "en", "fr", "es", "de", "it", "nl", "pt", "pl", "ca", "cs", "da",
  "el", "fi", "id", "ja", "ru", "sv", "ta", "th", "tr", "hu", "ro", "zh",
  "ar", "tl", "he", "hi", "hr", "ko", "ms", "no", "uk", "bg", "et", "sl", "sk",
] as const;
export type StreamTranscriptionLanguage =
  (typeof STREAM_TRANSCRIPTION_LANGUAGES)[number];

export function toStreamTranscriptionLanguage(
  language: string,
): StreamTranscriptionLanguage {
  return (STREAM_TRANSCRIPTION_LANGUAGES as readonly string[]).includes(
    language,
  )
    ? (language as StreamTranscriptionLanguage)
    : "auto";
}

export function streamCallCid(callType: string, meetingId: string) {
  return `${callType}:${meetingId}`;
}

export function meetingIdFromCallCid(callCid: string) {
  const [, id] = callCid.split(":");
  return id || null;
}

export function countHumanParticipants(
  participants: { user: { id: string } }[],
  agentIds: string[],
) {
  const agents = new Set(agentIds);
  const humans = new Set(
    participants
      .map((participant) => participant.user.id)
      .filter((id) => !agents.has(id)),
  );
  return humans.size;
}
