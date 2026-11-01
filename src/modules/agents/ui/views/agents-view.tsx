"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataPagination } from "@/components/data-pagination";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";
import { useAgentsFilters } from "../../hook/use-agents-filters";
import { useAgentColumns } from "../components/columns";

export const AgentsView = () => {
  const t = useTranslations("agents");
  const router = useRouter();
  const columns = useAgentColumns();
  const [filters, setFilter] = useAgentsFilters();
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions({ ...filters }));

  if (data.items.length === 0 && !filters.search) {
    return (
      <div className="flex-1 px-4 pb-8 md:px-8">
        <div className="rounded-xl border bg-card px-4 py-10">
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button asChild>
                <Link href="/dashboard/agents?new=1">
                  <PlusIcon />
                  {t("new")}
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8 px-4 md:px-8 flex flex-col gap-y-4">
      <DataTable
        columns={columns}
        data={data.items}
        onRowClick={(row) => router.push(`/dashboard/agents/${row.id}`)}
      />
      <DataPagination
        page={filters.page}
        totalPages={data.totalPages}
        onPageChange={(page) => setFilter({ page })}
      />
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
  const t = useTranslations("agents");
  const tStates = useTranslations("states");
  return <ErrorState title={t("loadError")} description={tStates("errorDescription")} />;
};
