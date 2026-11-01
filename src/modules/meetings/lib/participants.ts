// Pure rules for joining a meeting (waiting room, limits, guest identity).

import type { JoinMode } from "@/config/ai";

export type JoinDecision = "admitted" | "waiting" | "locked";

// People the host invited by email (personal link) skip the waiting room,
// like invited guests in Meet or Zoom; a locked room stays closed to them.
export function decideJoin(params: {
  joinMode: JoinMode | string;
  isOwner: boolean;
  invited?: boolean;
}): JoinDecision {
  if (params.isOwner) return "admitted";
  if (params.joinMode === "locked") return "locked";
  if (params.joinMode === "open" || params.invited) return "admitted";
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
