import { CallingState, StreamTheme, useCall } from "@stream-io/video-react-sdk";
import { useState } from "react";
import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";

interface Props {
  meetingId: string;
  meetingName: string;
  isHost: boolean;
}

export const CallUI = ({ meetingId, meetingName, isHost }: Props) => {
  const call = useCall();
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
  const [endedForAll, setEndedForAll] = useState(false);

  const handleJoin = async () => {
    if (!call) return;
    await call.join();
    setShow("call");
  };

  // The Stream leave button has already called call.leave() at this point.
  const handleLeave = () => {
    setShow("ended");
  };

  const handleEndedForAll = async () => {
    setEndedForAll(true);
    if (call && call.state.callingState !== CallingState.LEFT) {
      await call.leave();
    }
    setShow("ended");
  };

  return (
    <StreamTheme className="h-full">
      {show === "lobby" && <CallLobby onJoin={handleJoin} />}
      {show === "call" && (
        <CallActive
          meetingId={meetingId}
          meetingName={meetingName}
          isHost={isHost}
          onLeave={handleLeave}
          onEndedForAll={handleEndedForAll}
        />
      )}
      {show === "ended" && (
        <CallEnded
          meetingId={meetingId}
          isHost={isHost}
          endedForAll={endedForAll}
          onEndedForAll={() => setEndedForAll(true)}
        />
      )}
    </StreamTheme>
  );
};
