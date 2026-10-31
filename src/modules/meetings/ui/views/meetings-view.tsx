"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { DataPagination } from "@/components/data-pagination";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ListSkeleton } from "@/components/skeletons";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";
import { useMeetingsFilters } from "../../hook/use-meetings-filters";
import { useMeetingColumns } from "../components/columns";
import { InstantMeetingButton } from "../components/instant-meeting-button";

export const MeetingsView = () => {
  const t = useTranslations("meetings");
  const trpc = useTRPC();
  const router = useRouter();
  const columns = useMeetingColumns();
  const [filters, setFilters] = useMeetingsFilters();

  const { data } = useSuspenseQuery(
    trpc.meetings.getMany.queryOptions({ ...filters }),
  );

  const hasFilters = !!filters.search || !!filters.status || !!filters.agentId;

  if (data.items.length === 0 && !hasFilters) {
    return (
      <div className="flex-1 px-4 pb-8 md:px-8">
        <div className="rounded-xl border bg-card px-4 py-10">
          <EmptyState
            title={
              filters.view === "upcoming"
                ? t("emptyUpcoming")
                : filters.view === "past"
                  ? t("emptyPast")
                  : t("emptyTitle")
            }
            description={t("emptyDescription")}
            action={<InstantMeetingButton />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8 px-4 md:px-8 flex flex-col gap-y-4">
      <DataTable
        data={data.items}
        columns={columns}
        onRowClick={(row) => router.push(`/dashboard/meetings/${row.id}`)}
      />
      <DataPagination
        page={filters.page}
        totalPages={data.totalPages}
        onPageChange={(page) => setFilters({ page })}
      />
    </div>
  );
};

export const MeetingsViewLoading = () => {
  return (
    <div className="flex-1 pb-4 px-4 md:px-8">
      <ListSkeleton />
    </div>
  );
};

export const MeetingsViewError = () => {
  const t = useTranslations("meetings");
  const tStates = useTranslations("states");
  return <ErrorState title={t("loadError")} description={tStates("errorDescription")} />;
};
