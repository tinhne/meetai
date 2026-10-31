"use client";

import { ErrorState } from "@/components/error-state";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canJoinMeeting } from "@/modules/meetings/lib/rules";
import { CallProvider } from "../component/call-provider";

interface Props {
  meetingId: string;
}

const unavailableMessages = {
  completed: {
    title: "Meeting completed",
    description: "This meeting has ended. You can review the summary instead.",
  },
  processing: {
    title: "Meeting ended",
    description: "The summary is being generated and will appear shortly.",
  },
  cancelled: {
    title: "Meeting cancelled",
    description: "This meeting was cancelled and can no longer be joined.",
  },
  failed: {
    title: "Meeting ended",
    description: "This meeting has ended and can no longer be joined.",
  },
};

export const CallView = ({ meetingId }: Props) => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId }),
  );

  if (!canJoinMeeting(data.status)) {
    const message =
      unavailableMessages[data.status as keyof typeof unavailableMessages];

    return (
      <div className="flex justify-center items-center h-screen">
        <ErrorState title={message.title} description={message.description} />
      </div>
    );
  }

  return (
    <CallProvider
      meetingId={data.id}
      meetingName={data.name}
      hostId={data.userId}
    />
  );
};
