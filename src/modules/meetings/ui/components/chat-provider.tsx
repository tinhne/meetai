"use client";

import { LoadingState } from "@/components/loading-state";
import { authClient } from "@/lib/auth-client";
import { ChatUI } from "./chat-ui";

interface Props {
  meetingId: string;
  meetingName: string;
}

export const ChatProvider = ({ meetingId, meetingName }: Props) => {
  const { data, isPending } = authClient.useSession();

  // 1. Trạng thái đang tải
  if (isPending) {
    return <LoadingState title="Loading..." description="Setting up chat..." />;
  }

  // 2. Trạng thái chưa đăng nhập (Quan trọng!)
  if (!data?.user) {
    return (
      <div className="p-4 text-center border rounded-lg">
        Vui lòng đăng nhập để sử dụng chat.
      </div>
    );
  }

  return (
    <ChatUI
      meetingId={meetingId}
      meetingName={meetingName}
      userId={data.user.id}
      userName={data.user.name}
      userImage={data.user.image || "undefined"}
    />
  );
};
