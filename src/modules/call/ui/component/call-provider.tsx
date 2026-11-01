"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { generateAvatar } from "@/lib/avatar";
import type { MeetingGetOne } from "@/modules/meetings/types";
import { useTRPC } from "@/trpc/client";
import { CallConnect } from "./call-connect";

interface Props {
  meeting: MeetingGetOne;
}

// Call entry for the meeting owner (from the dashboard).
export const CallProvider = ({ meeting }: Props) => {
  const trpc = useTRPC();
  const { data, isPending } = authClient.useSession();
  const { mutateAsync: generateToken } = useMutation(
    trpc.meetings.generateToken.mutationOptions(),
  );
  const { mutateAsync: askAgent } = useMutation(
    trpc.meetings.askAgent.mutationOptions(),
  );

  if (!data || isPending) {
    return (
      <div className="flex h-svh items-center justify-center bg-stage text-stage-foreground">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <CallConnect
      callType={meeting.callType}
      user={{
        id: data.user.id,
        name: data.user.name,
        image: data.user.image ?? generateAvatar(data.user.name, "initials"),
      }}
      tokenProvider={() => generateToken({ meetingId: meeting.id })}
      info={{
        meetingId: meeting.id,
        meetingName: meeting.name,
        language: meeting.language,
        aiMode: meeting.aiMode,
        joinMode: meeting.joinMode,
        agentId: meeting.agentId,
        isHost: meeting.userId === data.user.id,
        canRate: true,
        askAgent: () => askAgent({ id: meeting.id }),
        backHref: `/dashboard/meetings/${meeting.id}`,
      }}
    />
  );
};
