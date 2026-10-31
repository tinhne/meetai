"use client";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

interface Props {
  meetingId: string;
  isHost: boolean;
  endedForAll: boolean;
  onEndedForAll: () => void;
}

export const CallEnded = ({
  meetingId,
  isHost,
  endedForAll,
  onEndedForAll,
}: Props) => {
  const trpc = useTRPC();
  const endCall = useMutation(
    trpc.meetings.endCall.mutationOptions({
      onSuccess: () => onEndedForAll(),
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
      <div className="px-8 py-4 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center bg-background gap-y-6 rounded-lg p-10 shadow-sm max-w-md">
          <div className="flex flex-col gap-y-2 text-center">
            <h6 className="text-lg font-medium">
              {endedForAll ? "The meeting has ended" : "You left the meeting"}
            </h6>
            <p className="text-sm text-muted-foreground">
              {endedForAll
                ? "Your summary will appear in a few minutes."
                : "The meeting ends automatically a few minutes after everyone has left. The summary is generated after that."}
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full justify-center">
            <Button asChild variant={endedForAll ? "default" : "outline"}>
              <Link href={`/dashboard/meetings/${meetingId}`}>
                Back to meeting
              </Link>
            </Button>
            {isHost && !endedForAll && (
              <Button
                disabled={endCall.isPending}
                onClick={() => endCall.mutate({ id: meetingId })}
              >
                End meeting now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
