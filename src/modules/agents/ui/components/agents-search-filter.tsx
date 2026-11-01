import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { useAgentsFilters } from "../../hook/use-agents-filters";

export const AgentSearchFilter = () => {
  const t = useTranslations("agents");
  const [filters, setFilters] = useAgentsFilters();
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="h-9 w-56 bg-background pl-8"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
      />
    </div>
  );
};
