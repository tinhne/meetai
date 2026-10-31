"use client";

import { CalendarPlusIcon, XCircleIcon } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_PAGE } from "@/constants";
import { useMeetingsFilters } from "../../hook/use-meetings-filters";
import { MEETING_VIEWS, type MeetingView } from "../../types";
import { AgentIdFilter } from "./agent-id-filter";
import { InstantMeetingButton } from "./instant-meeting-button";
import { MeetingSearchFilter } from "./meeting-search-filter";
import { NewMeetingDialog } from "./new-meeting-dialog";
import { StatusFilter } from "./status-filter";

export const MeetingsListHeader = () => {
  const t = useTranslations("meetings");
  const [filters, setFilters] = useMeetingsFilters();
  // "?new=1" opens the dialog (used by the command palette and shortcuts).
  const [isNewOpen, setIsNewOpen] = useQueryState(
    "new",
    parseAsBoolean.withDefault(false),
  );

  const isAnyFilterModified =
    !!filters.search || !!filters.status || !!filters.agentId;

  const onClearFilters = () => {
    setFilters({ search: "", status: null, agentId: "", page: DEFAULT_PAGE });
  };

  return (
    <>
      <NewMeetingDialog
        open={isNewOpen}
        onOpenChange={(open) => setIsNewOpen(open ? true : null)}
      />
      <div className="py-6 px-4 md:px-8 flex flex-col gap-y-5">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsNewOpen(true)}>
                <CalendarPlusIcon />
                {t("schedule")}
              </Button>
              <InstantMeetingButton />
            </>
          }
        />
        <Tabs
          value={filters.view}
          onValueChange={(value) =>
            setFilters({ view: value as MeetingView, page: DEFAULT_PAGE, status: null })
          }
        >
          <TabsList>
            {MEETING_VIEWS.map((view) => (
              <TabsTrigger key={view} value={view}>
                {t(`tabs.${view}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ScrollArea>
          <div className="flex items-center p-1 gap-x-2">
            <MeetingSearchFilter />
            {filters.view === "all" && <StatusFilter />}
            <AgentIdFilter />
            {isAnyFilterModified && (
              <Button variant="ghost" onClick={onClearFilters}>
                <XCircleIcon className="size-4" />
                {t("clearFilters")}
              </Button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
};
