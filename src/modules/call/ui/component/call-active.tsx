"use client";

import { CallControls, SpeakerLayout } from "@stream-io/video-react-sdk";
import { useMutation } from "@tanstack/react-query";
import { PhoneOffIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/modules/agents/hook/use-confirm";
import { useTRPC } from "@/trpc/client";

interface Props {
  meetingId: string;
  meetingName: string;
  isHost: boolean;
  onLeave: () => void;
  onEndedForAll: () => void;
}

export const CallActive = ({
  meetingId,
  meetingName,
  isHost,
  onLeave,
  onEndedForAll,
}: Props) => {
  const trpc = useTRPC();
  const [EndConfirmation, confirmEnd] = useConfirm(
    "End meeting for everyone?",
    "All participants will be disconnected and the AI summary will start generating.",
  );

  const endCall = useMutation(
    trpc.meetings.endCall.mutationOptions({
      onSuccess: () => onEndedForAll(),
      onError: (error) => toast.error(error.message),
    }),
  );

  const handleEndForAll = async () => {
    const ok = await confirmEnd();
    if (!ok) return;
    endCall.mutate({ id: meetingId });
  };

  return (
    <div className="flex flex-col p-4 h-full justify-center text-white">
      <EndConfirmation />
      <div className="bg-[#101213] rounded-full p-4 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center justify-center p-1 bg-white-10 rounded-full w-fit"
        >
          <Image src="/logo.svg" alt="Logo" width={22} height={22} />
        </Link>
        <h4 className="text-base">{meetingName}</h4>
        {isHost && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto rounded-full"
            disabled={endCall.isPending}
            onClick={handleEndForAll}
          >
            <PhoneOffIcon />
            End for everyone
          </Button>
        )}
      </div>
      <SpeakerLayout />
      <div className="rounded-full px-4 bg-[#101213]">
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  );
};
