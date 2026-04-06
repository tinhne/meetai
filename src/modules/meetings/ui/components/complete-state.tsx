import Markdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingGetOne } from "../../types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  BookOpenTextIcon,
  ClockFadingIcon,
  FileTextIcon,
  FileVideoIcon,
  SparkleIcon,
} from "lucide-react";
import Link from "next/link";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { Transcript } from "./transcript";
import { ChatProvider } from "./chat-provider";

interface Props {
  data: MeetingGetOne;
}

export const CompletedState = ({ data }: Props) => {
  return (
    <div className="flex flex-col gap-y-4">
      <Tabs defaultValue="sumary">
        <div className="bg-white rounded-lg border px-3">
          <ScrollArea>
            <TabsList className="p-0 bg-background justify-start rounded-none h-13">
              <TabsTrigger
                value="sumary"
                className="text-muted-foreground rounded-none bg-background data:[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground"
              >
                <BookOpenTextIcon className="mr-2" />
                Sumary
              </TabsTrigger>
              <TabsTrigger
                value="transcript"
                className="text-muted-foreground rounded-none bg-background data:[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground"
              >
                <FileTextIcon className="mr-2" />
                Transcript
              </TabsTrigger>
              <TabsTrigger
                value="recording"
                className="text-muted-foreground rounded-none bg-background data:[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground"
              >
                <FileVideoIcon className="mr-2" />
                Recording
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="text-muted-foreground rounded-none bg-background data:[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground"
              >
                <SparkleIcon className="mr-2" />
                Ask AI
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <TabsContent value="chat">
          <ChatProvider meetingId={data.id} meetingName={data.name} />
        </TabsContent>
        <TabsContent value="transcript">
          <Transcript meetingid={data.id} />
        </TabsContent>
        <TabsContent value="recording">
          <div className="bg-white rounded-lg border px-4 py-5">
            <video
              src={data.recordingUrl!}
              controls
              className="w-full rounded-lg"
            />
          </div>
        </TabsContent>
        <TabsContent value="sumary">
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-5 gap-y-5 flex flex-col col-span-5">
              <h2 className="text-2xl font-medium capitalize">{data.name}</h2>
              <div className="gap-x-2 flex items-center">
                <Link
                  href={`/dashboard/agents/${data.agent.id}`}
                  className="flex items-center gap-x-2 underline underline-offset-4 capitalize"
                >
                  <GeneratedAvatar
                    variant="botttsNeutral"
                    seed={data.agent.name}
                    className="size-5"
                  />
                  {data.agent.name}
                </Link>
                {data.startedAt ? format(new Date(data.startedAt), "PPpp") : ""}
              </div>
              <div className="gap-x-2 flex items-center ">
                <SparkleIcon className="size-5" />
                <p>General summary</p>
              </div>
              <Badge
                variant="outline"
                className="flex items-center gap-x-2 [&svg]:size-4"
              >
                <ClockFadingIcon className="text-blue-700" />
                {data.duration ? formatDuration(data.duration) : ""}
              </Badge>
            </div>
            <div className="border-t px-4 py-5">
              <Markdown
                components={{
                  h1: (props) => (
                    <h1 className="text-2xl font-medium mb-6" {...props} />
                  ),
                  h2: (props) => (
                    <h2 className="text-xl font-medium mb-4" {...props} />
                  ),
                  h3: (props) => (
                    <h3 className="text-lg font-medium mb-2" {...props} />
                  ),
                  h4: (props) => (
                    <h4 className="text-base font-medium mb-1" {...props} />
                  ),
                  p: (props) => (
                    <p className="mb-2 leading-relaxed" {...props} />
                  ),
                  ol: (props) => (
                    <ol className="list-decimal list-inside mb-2" {...props} />
                  ),
                  li: (props) => <li className="mb-1" {...props} />,
                  strong: (props) => (
                    <strong className="font-semibold" {...props} />
                  ),
                  code: (props) => (
                    <code
                      className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm"
                      {...props}
                    />
                  ),
                  blockquote: (props) => (
                    <blockquote
                      className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2"
                      {...props}
                    />
                  ),
                }}
              >
                {data.summary}
              </Markdown>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
