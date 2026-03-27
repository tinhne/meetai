"use client";
import { LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { CallUI } from "./call-ui";

interface Props {
  meetingId: string;
  meetingName: string;
  userId: string;
  userName: string;
  userImage: string;
}

export const CallConnect = ({
  meetingId,
  meetingName,
  userId,
  userName,
  userImage,
}: Props) => {
  const trpc = useTRPC();
  const { mutateAsync: generateToken } = useMutation(
    trpc.meetings.generateToken.mutationOptions(),
  );
  const [client, setClient] = useState<StreamVideoClient>();

  useEffect(() => {
    const myClient = new StreamVideoClient({
      apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
      user: {
        id: userId,
        name: userName,
        image: userImage,
      },
      tokenProvider: generateToken,
    });
    setClient(myClient);

    return () => {
      myClient.disconnectUser();
      setClient(undefined);
    };
  }, [userId, userName, userImage, generateToken]);

  const [call, setCall] = useState<Call>();

  useEffect(() => {
    if (!client) return;
    const myCall = client.call("default", meetingId);
    myCall.camera.disable();
    myCall.microphone.disable();
    setCall(myCall);

    return () => {
      if (myCall.state.callingState !== CallingState.LEFT) {
        myCall.leave();
        myCall.endCall();
        setCall(undefined);
      }
    };
  }, [client, meetingId]);

  if (!client || !call) {
    return (
      <div className="flex h-screen justify-center items-center bg-radial from-sidebar-accent">
        <LoaderIcon className="animate-spin size-6 text-white" />
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallUI meetingName={meetingName} />
      </StreamCall>
    </StreamVideo>
  );
};
