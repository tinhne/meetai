import {
  CircleCheckIcon,
  CircleXIcon,
  ClockArrowUpIcon,
  LoaderIcon,
  RadioIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { MeetingStatus } from "../../types";

const statusConfig: Record<MeetingStatus, { tone: StatusTone; icon: LucideIcon }> =
  {
    [MeetingStatus.Upcoming]: { tone: "warning", icon: ClockArrowUpIcon },
    [MeetingStatus.Active]: { tone: "info", icon: RadioIcon },
    [MeetingStatus.Completed]: { tone: "success", icon: CircleCheckIcon },
    [MeetingStatus.Processing]: { tone: "ai", icon: LoaderIcon },
    [MeetingStatus.Cancelled]: { tone: "neutral", icon: CircleXIcon },
    [MeetingStatus.Failed]: { tone: "danger", icon: TriangleAlertIcon },
  };

export const MeetingStatusBadge = ({ status }: { status: MeetingStatus }) => {
  const { tone, icon: Icon } = statusConfig[status];

  return (
    <StatusBadge
      tone={tone}
      icon={
        <Icon
          className={cn(status === MeetingStatus.Processing && "animate-spin")}
        />
      }
    >
      {status}
    </StatusBadge>
  );
};
