"use client";

import { useCall } from "@stream-io/video-react-sdk";
import { useCallback, useEffect, useState } from "react";

export interface CallChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  sentAt: number;
}

const CHAT_EVENT = "meetai.chat";
const MAX_MESSAGES = 200;

// In-call chat over Stream custom events: visible to people in the call,
// not stored anywhere.
export function useCallChat() {
  const call = useCall();
  const [messages, setMessages] = useState<CallChatMessage[]>([]);

  useEffect(() => {
    if (!call) return;

    return call.on("custom", (event) => {
      const custom = event.custom as { kind?: string; id?: string; text?: string };
      if (custom.kind !== CHAT_EVENT || typeof custom.text !== "string") return;

      setMessages((current) =>
        [
          ...current,
          {
            id: custom.id ?? `${event.user.id}-${event.created_at}`,
            text: custom.text!.slice(0, 2000),
            userId: event.user.id,
            userName: event.user.name ?? event.user.id,
            sentAt: Date.parse(event.created_at) || Date.now(),
          },
        ].slice(-MAX_MESSAGES),
      );
    });
  }, [call]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!call || !message) return;
      await call.sendCustomEvent({
        kind: CHAT_EVENT,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: message.slice(0, 2000),
      });
    },
    [call],
  );

  return { messages, send };
}
