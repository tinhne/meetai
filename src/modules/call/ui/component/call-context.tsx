"use client";

import { createContext, useContext, type ReactNode } from "react";

// Meeting info and actions available anywhere inside the call room.
export interface CallRoomInfo {
  meetingId: string;
  meetingName: string;
  language: string;
  aiMode: string;
  joinMode: string;
  agentId: string;
  isHost: boolean;
  // Signed-in hosts / participants can rate the AI after the call.
  canRate: boolean;
  askAgent: () => Promise<unknown>;
  // Where to go after the call (null for guests).
  backHref: string | null;
}

const CallRoomContext = createContext<CallRoomInfo | null>(null);

export const CallRoomProvider = ({
  value,
  children,
}: {
  value: CallRoomInfo;
  children: ReactNode;
}) => <CallRoomContext.Provider value={value}>{children}</CallRoomContext.Provider>;

export const useCallRoom = () => {
  const value = useContext(CallRoomContext);
  if (!value) throw new Error("useCallRoom must be used inside CallRoomProvider");
  return value;
};
