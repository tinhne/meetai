import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { generateAvatar } from "@/lib/avatar";
import { useTRPC } from "@/trpc/client";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import Highlighter from "react-highlight-words";

interface Props {
  meetingid: string;
}

export const Transcript = ({ meetingid }: Props) => {
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.meetings.getTranscription.queryOptions({ id: meetingid }),
  );
  const [searchQuery, setSearchQuery] = useState("");
  // const filtered = (data ?? []).filter((item) =>
  //   item.text.toString().toLowerCase().includes(searchQuery.toLowerCase())
  // );

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase();

    return data.filter((item) => item.text?.toLowerCase().includes(query));
  }, [data, searchQuery]);

  return (
    <div className="bg-white rounded-lg border px-4 py-5 flex flex-col gap-y-4 w-full">
      <p className="text-sm font-medium">Transcript</p>
      <div className="relative">
        <Input
          placeholder="Search in transcript..."
          className="pl-7 h-9 w-60"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      </div>
      <ScrollArea>
        <div className="flex flex-col gap-y-3 pr-2">
          {filtered.map((item) => (
            <div
              key={item.start_ts}
              className="flex flex-col gap-y-2 hover:bg-muted p-4 rounded-md border"
            >
              <div className="flex gap-x-2 items-center">
                <Avatar className="size-6">
                  <AvatarImage
                    src={
                      item.user?.image ??
                      generateAvatar(
                        item.user?.name ?? "Unknown Speaker",
                        "initials",
                      )
                    }
                    alt="user avatar"
                  />
                </Avatar>
                <p className="text-sm font-medium">{item.user?.name}</p>
                <p className="text-sm font-medium">
                  {format(new Date(0, 0, 0, 0, 0, 0, item.start_ts), "mm:ss")}
                </p>
              </div>
              <Highlighter
                searchWords={[searchQuery]}
                autoEscape
                textToHighlight={item.text ?? ""}
                className="text-sm text-neutral-700"
                highlightClassName="bg-yellow-200"
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
