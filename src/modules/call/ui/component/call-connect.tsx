"use client";

import {
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { LoaderIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { CallRoomProvider, type CallRoomInfo } from "./call-context";
import { CallUI } from "./call-ui";

interface Props {
  info: CallRoomInfo;
  callType: string;
  user: { id: string; name: string; image: string };
  tokenProvider: () => Promise<string>;
}

export const CallConnect = ({ info, callType, user, tokenProvider }: Props) => {
  const t = useTranslations("call");
  const [client, setClient] = useState<StreamVideoClient>();
  const [call, setCall] = useState<Call>();
  // Keep the latest provider without recreating the client on every render.
  const tokenProviderRef = useRef(tokenProvider);
  useEffect(() => {
    tokenProviderRef.current = tokenProvider;
  }, [tokenProvider]);

  useEffect(() => {
    const myClient = new StreamVideoClient({
      apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
      user: { id: user.id, name: user.name, image: user.image },
      tokenProvider: () => tokenProviderRef.current(),
    });
    // The client is an external resource owned by this effect.
    setClient(myClient);

    return () => {
      void myClient.disconnectUser();
      setClient(undefined);
    };
  }, [user.id, user.name, user.image]);

  useEffect(() => {
    if (!client) return;
    const myCall = client.call(callType, info.meetingId);
    myCall.camera.disable();
    myCall.microphone.disable();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCall(myCall);

    // Unmounting (navigation, refresh) only leaves the call. Ending it for
    // everyone is an explicit host action.
    return () => {
      if (myCall.state.callingState !== CallingState.LEFT) {
        void myCall.leave();
      }
      setCall(undefined);
    };
  }, [client, callType, info.meetingId]);

  if (!client || !call) {
    return (
      <div
        role="status"
        className="flex h-svh flex-col items-center justify-center gap-3 bg-stage text-stage-foreground"
      >
        <LoaderIcon className="size-6 animate-spin" />
        <span className="text-sm opacity-70">{t("connecting")}</span>
      </div>
    );
  }

  return (
    <CallRoomProvider value={info}>
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallUI />
        </StreamCall>
      </StreamVideo>
    </CallRoomProvider>
  );
};
