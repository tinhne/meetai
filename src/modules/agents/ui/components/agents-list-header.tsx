"use client";

import { PlusIcon, XCircleIcon } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE } from "@/constants";
import { useAgentsFilters } from "../../hook/use-agents-filters";
import { AgentSearchFilter } from "./agents-search-filter";
import { NewAgentDialog } from "./new-agent-dialog";

export const ListHeader = () => {
  const t = useTranslations("agents");
  const [filters, setFilters] = useAgentsFilters();
  // "?new=1" opens the dialog (used by the command palette).
  const [isNewOpen, setIsNewOpen] = useQueryState(
    "new",
    parseAsBoolean.withDefault(false),
  );

  return (
    <>
      <NewAgentDialog
        open={isNewOpen}
        onOpenChange={(open) => setIsNewOpen(open ? true : null)}
      />
      <div className="py-6 px-4 md:px-8 flex flex-col gap-y-5">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <Button onClick={() => setIsNewOpen(true)}>
              <PlusIcon />
              {t("new")}
            </Button>
          }
        />
        <div className="flex items-center gap-2">
          <AgentSearchFilter />
          {!!filters.search && (
            <Button variant="ghost" onClick={() => setFilters({ search: "", page: DEFAULT_PAGE })}>
              <XCircleIcon className="size-4" />
              {t("clearFilters")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
