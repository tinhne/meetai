import { LoadingState } from "@/components/loading-state";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Channel as StreamChannel } from "stream-chat";
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
  useCreateChatClient,
} from "stream-chat-react";

import "stream-chat-react/dist/css/v2/index.css";

interface Props {
  meetingId: string;
  userId: string;
  userName: string;
  userImage: string | undefined;
}

export const ChatUI = ({
  meetingId,
  userId,
  userName,
  userImage,
}: Props) => {
  const trpc = useTRPC();
  const { mutateAsync: generateChatToken } = useMutation(
    trpc.meetings.generateChatToken.mutationOptions(),
  );
  const { mutateAsync: ensureChatChannel } = useMutation(
    trpc.meetings.ensureChatChannel.mutationOptions(),
  );

  const [channel, setChannel] = useState<StreamChannel>();

  const client = useCreateChatClient({
    apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
    tokenOrProvider: generateChatToken,
    userData: {
      id: userId,
      name: userName,
      image: userImage ?? undefined,
    },
  });

  useEffect(() => {
    if (!client) return;

    let cancelled = false;

    // The channel and its members are created on the server; the client only
    // watches it.
    ensureChatChannel({ id: meetingId })
      .then(({ channelId }) => {
        if (cancelled) return;
        setChannel(client.channel("messaging", channelId));
      })
      .catch((error: Error) => {
        if (!cancelled) toast.error(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [client, meetingId, ensureChatChannel]);

  if (!client || !channel) {
    return (
      <LoadingState
        title="Loading chat"
        description="This may take a few minutes"
      />
    );
  }
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <Chat client={client}>
        <Channel channel={channel}>
          <Window>
            <div className="flex flex-col h-[calc(100vh-23rem)] border-b">
              <div className="flex-1 min-h-0">
                <MessageList />
              </div>
              <MessageInput />
            </div>
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
