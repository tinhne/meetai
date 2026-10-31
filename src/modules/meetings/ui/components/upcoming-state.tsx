import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { VideoIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Props {
  meetingId: string;
  scheduledAt: string | null;
}

export const UpcomingState = ({ meetingId, scheduledAt }: Props) => {
  return (
    <div className="bg-card rounded-xl border px-4 py-8 flex flex-col gap-y-8 items-center">
      <EmptyState
        title="Not started yet"
        description={
          scheduledAt
            ? `Scheduled for ${format(new Date(scheduledAt), "PPpp")}. Once the meeting ends, the summary will appear here.`
            : "Once you start this meeting, a summary will appear here."
        }
        image="/upcoming.svg"
      />
      <div className="flex flex-col-reverse lg:flex-row lg:justify-center items-center gap-2 w-full">
        <Button asChild className="w-full lg:w-auto">
          <Link href={`/call/${meetingId}`}>
            <VideoIcon />
            Start meeting
          </Link>
        </Button>
      </div>
    </div>
  );
};
