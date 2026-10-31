import { useTranslations } from "next-intl";

import { CommandSelect } from "@/components/command-select";
import { useMeetingsFilters } from "../../hook/use-meetings-filters";
import { MeetingStatus } from "../../types";
import { MeetingStatusBadge } from "./meeting-status-badge";

export const StatusFilter = () => {
  const t = useTranslations("meetings");
  const [filters, setFilters] = useMeetingsFilters();

  return (
    <CommandSelect
      placeholder={t("statusFilter")}
      className="h-9"
      options={Object.values(MeetingStatus).map((status) => ({
        id: status,
        value: status,
        children: <MeetingStatusBadge status={status} />,
      }))}
      onSelect={(value) => setFilters({ status: value as MeetingStatus, page: 1 })}
      value={filters.status ?? ""}
    />
  );
};
