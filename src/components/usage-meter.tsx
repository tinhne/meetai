import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  used: number;
  // null means unlimited
  limit: number | null;
  className?: string;
}

export const UsageMeter = ({ label, used, limit, className }: Props) => {
  const percent =
    limit === null ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  const isAtLimit = limit !== null && used >= limit;

  return (
    <div className={cn("flex flex-col gap-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        <span className={cn("tabular-nums", isAtLimit && "font-semibold")}>
          {limit === null ? used : `${used}/${limit}`}
        </span>
      </div>
      {limit !== null && (
        <Progress
          value={percent}
          aria-label={label}
          className={cn(isAtLimit && "[&>*]:bg-warning")}
        />
      )}
    </div>
  );
};
