"use client";

import {
  CallingState,
  StreamTheme,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";

import { CallEnded } from "./call-ended";
import { CallLobby } from "./call-lobby";
import { CallRoom } from "./call-room";

export const CallUI = () => {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
  const [endedForAll, setEndedForAll] = useState(false);

  // Ended by the host, removed, or disconnected for good.
  useEffect(() => {
    if (show === "call" && callingState === CallingState.LEFT) {
      setShow("ended");
    }
  }, [show, callingState]);

  const handleJoin = async () => {
    if (!call) return;
    await call.join();
    setShow("call");
  };

  const handleLeave = async (forEveryone: boolean) => {
    if (forEveryone) setEndedForAll(true);
    if (call && call.state.callingState !== CallingState.LEFT) {
      await call.leave();
    }
    setShow("ended");
  };

  return (
    <StreamTheme className="h-full">
      {show === "lobby" && <CallLobby onJoin={handleJoin} />}
      {show === "call" && <CallRoom onLeave={handleLeave} />}
      {show === "ended" && (
        <CallEnded
          endedForAll={endedForAll}
          onEndedForAll={() => setEndedForAll(true)}
        />
      )}
    </StreamTheme>
  );
};
