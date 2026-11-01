import type { Metadata } from "next";
import { getFormatter } from "next-intl/server";

import { NotesDocument } from "@/modules/meetings/ui/components/notes-document";
import { PrintButton } from "@/modules/meetings/ui/components/print-button";
import type { MeetingInsights } from "@/server/ai/schemas";
import { requireSession } from "@/server/session";
import { caller } from "@/trpc/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ meetingId: string }>;
}

// Clean, always-light document for "Print / save as PDF".
const PrintPage = async ({ params }: Props) => {
  await requireSession();
  const { meetingId } = await params;
  const format = await getFormatter();

  const [meeting, transcript, actionItems] = await Promise.all([
    caller.meetings.getOne({ id: meetingId }),
    caller.meetings.getTranscription({ id: meetingId }),
    caller.meetings.getActionItems({ id: meetingId }),
  ]);

  return (
    <div className="light min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10 print:px-0 print:py-0">
        <div className="mb-6 flex justify-end print:hidden">
          <PrintButton />
        </div>
        <NotesDocument
          name={meeting.name}
          dateLabel={
            meeting.startedAt
              ? format.dateTime(new Date(meeting.startedAt), { dateStyle: "long", timeStyle: "short" })
              : null
          }
          agentName={meeting.agent.name}
          insights={meeting.insights as MeetingInsights | null}
          summary={meeting.summary}
          actionItems={actionItems}
          transcript={transcript.map((item) => ({
            speakerName: item.user?.name ?? "",
            startMs: item.start_ts,
            text: item.text ?? "",
          }))}
        />
      </div>
    </div>
  );
};

export default PrintPage;
