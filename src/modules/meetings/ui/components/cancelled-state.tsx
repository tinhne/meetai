import { EmptyState } from "@/components/empty-state";

export const CancelledState = () => {
  return (
    <div className="bg-card rounded-xl border px-4 py-8 flex flex-col gap-y-8 items-center">
      <EmptyState
        title="Meeting is cancelled"
        description="This meeting has been cancelled"
        image="/cancelled.svg"
      />
    </div>
  );
};
