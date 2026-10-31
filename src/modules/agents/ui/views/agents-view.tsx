"use client";

import { ErrorState } from "@/components/error-state";
import { ListSkeleton } from "@/components/skeletons";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { columns } from "../components/columns";
import { EmptyState } from "@/components/empty-state";
import { useAgentsFilters } from "../../hook/use-agents-filters";
import { DataPagination } from "@/components/data-pagination";
import { useRouter } from "@/i18n/navigation";
import { DataTable } from "@/components/data-table";

export const AgentsView = () => {
  const routes = useRouter();
  const [filters, setFilter] = useAgentsFilters();
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.agents.getMany.queryOptions({
      ...filters,
    }),
  );

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      <DataTable
        columns={columns}
        data={data.items}
        onRowClick={(row) => routes.push(`/dashboard/agents/${row.id}`)}
      />
      <DataPagination
        page={filters.page}
        totalPages={data.totalPages}
        onPageChange={(page) => {
          setFilter({ page });
        }}
      />
      {data.items.length === 0 && (
        <EmptyState
          title="Create your first agent"
          description="Create an agent to join  your meetings. With agents will follow your instructions and can interact with other participants in the meeting."
        />
      )}
    </div>
  );
};

export const AgentsViewLoading = () => {
  return (
    <div className="flex-1 pb-4 px-4 md:px-8">
      <ListSkeleton />
    </div>
  );
};

export const AgentsViewError = () => {
  return (
    <ErrorState
      title="Failed to load agents"
      description="please try again later"
    />
  );
};
