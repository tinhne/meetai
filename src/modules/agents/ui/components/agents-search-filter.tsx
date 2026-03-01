import { Input } from "@/components/ui/input";
import { useAgentsFilters } from "../../hook/use-agents-filters";
import { SearchIcon } from "lucide-react";

export const AgentSearchFilter = () => {
  const [filters, setFilters] = useAgentsFilters();
  return (
    <div className="relative">
      <Input
        placeholder="Filter by name"
        className="h-9 pl-7 bg-white w-[200px]"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
      />
      <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  );
};
