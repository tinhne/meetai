// Pure rules for joining a meeting (waiting room, limits, guest identity).

import type { JoinMode } from "@/config/ai";

export type JoinDecision = "admitted" | "waiting" | "locked";

export function decideJoin(params: {
  joinMode: JoinMode | string;
  isOwner: boolean;
}): JoinDecision {
  if (params.isOwner) return "admitted";
  if (params.joinMode === "locked") return "locked";
  if (params.joinMode === "open") return "admitted";
  return "waiting";
}

// maxParticipants counts people (host included), never the AI agent.
export function hasRoomForMore(admittedPeople: number, maxParticipants: number) {
  return admittedPeople < maxParticipants;
}

export function guestStreamUserId(participantId: string) {
  return `guest_${participantId}`;
}

export function cleanGuestName(name: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, 60);
}
