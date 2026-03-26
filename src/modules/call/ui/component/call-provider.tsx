"use client";

import { authClient } from "@/lib/auth-client";
import { LoaderIcon } from "lucide-react";
import { CallConnect } from "./call-connect";
import { generateAvatar } from "@/lib/avatar";

interface Props {
  meetingId: string;
  meetingName: string;
}

export const CallProvider = ({ meetingId, meetingName }: Props) => {
  const { data, isPending } = authClient.useSession();

  if (!data || isPending) {
    return (
      <div className="flex h-screen justify-center items-center bg-radial from-sidebar-accent">
        <LoaderIcon className="animate-spin size-6 text-white" />
      </div>
    );
  }

  return (
    <CallConnect
      meetingId={meetingId}
      meetingName={meetingName}
      userId={data.user.id}
      userName={data.user.name}
      userImage={
        data.user.image ?? generateAvatar(data.user.name, "botttsNeutral")
      }
    />
  );
};
