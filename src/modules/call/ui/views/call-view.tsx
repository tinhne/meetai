"use client";

import { ErrorState } from "@/components/error-state";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CallProvider } from "../component/call-provider";

interface Props {
  meetingId: string;
}

export const CallView = ({ meetingId }: Props) => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId }),
  );

  if (data.status === "completed") {
    return (
      <div className="flex justify-center items-center h-screen">
        <ErrorState
          title="Meeting Completed"
          description="You can no longer join this meeting."
        />
      </div>
    );
  }

  return <CallProvider meetingId={data.id} meetingName={data.name} />;
};
