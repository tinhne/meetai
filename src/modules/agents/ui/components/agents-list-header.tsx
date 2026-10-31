"use client";
import { Button } from "@/components/ui/button";
import { PlusIcon, XCircleIcon } from "lucide-react";
import { NewAgentDialog } from "./new-agent-dialog";
import { parseAsBoolean, useQueryState } from "nuqs";
import { AgentSearchFilter } from "./agents-search-filter";
import { useAgentsFilters } from "../../hook/use-agents-filters";
import { DEFAULT_PAGE } from "@/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const ListHeader = () => {
  const [filters, setFilters] = useAgentsFilters();
  // "?new=1" opens the dialog (used by the command palette).
  const [isNewOpen, setIsNewOpen] = useQueryState(
    "new",
    parseAsBoolean.withDefault(false),
  );
  const setIsDialogOpen = (open: boolean) => setIsNewOpen(open ? true : null);

  const isAnyFilterModified = !!filters.search;
  const onClearFilters = () => {
    setFilters({ search: "", page: DEFAULT_PAGE });
  };

  return (
    <>
      <NewAgentDialog open={isNewOpen} onOpenChange={setIsDialogOpen} />
      <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Agents</h5>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusIcon />
            New Agent
          </Button>
        </div>
        <ScrollArea>
          <div className="flex items-center p-1 gap-x-2">
            <AgentSearchFilter />
            {isAnyFilterModified && (
              <Button onClick={onClearFilters} variant="outline" size="sm">
                <XCircleIcon className="size-4" />
                Clear Filters
              </Button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
};
