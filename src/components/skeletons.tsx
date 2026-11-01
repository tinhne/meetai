import { Skeleton } from "@/components/ui/skeleton";

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
};

export const CardGridSkeleton = ({ cards = 3 }: { cards?: number }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
};
