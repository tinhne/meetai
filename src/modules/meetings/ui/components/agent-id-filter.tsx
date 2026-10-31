import { useTRPC } from "@/trpc/client";
import { useMeetingsFilters } from "../../hook/use-meetings-filters";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommandSelect } from "@/components/command-select";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { useTranslations } from "next-intl";

export const AgentIdFilter = () => {
  const t = useTranslations("meetings");
  const [filters, setFilter] = useMeetingsFilters();
  const [agentSearch, setAgentSearch] = useState("");

  const trpc = useTRPC();

  const { data } = useQuery(
    trpc.agents.getMany.queryOptions({
      pageSize: 100,
      search: agentSearch,
    }),
  );

  return (
    <CommandSelect
      placeholder={t("agentFilter")}
      className="h-9"
      options={(data?.items ?? []).map((agent) => ({
        id: agent.id,
        value: agent.id,
        children: (
          <div className="flex items-center gap-x-2">
            <GeneratedAvatar
              seed={agent.name}
              variant="botttsNeutral"
              className="size-4"
            />
            {agent.name}
          </div>
        ),
      }))}
      onSelect={(value) => setFilter({ agentId: value, page: 1 })}
      onSearch={setAgentSearch}
      value={filters.agentId ?? ""}
    />
  );
};
