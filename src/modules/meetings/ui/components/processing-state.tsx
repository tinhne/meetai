import { EmptyState } from "@/components/empty-state";

export const ProcessingState = () => {
  return (
    <div className="bg-card rounded-xl border px-4 py-8 flex flex-col gap-y-8 items-center">
      <EmptyState
        title="Meeting is processing"
        description="This meeting is currently being processed, a summary will appear soon"
        image="/processing.svg"
      />
    </div>
  );
};
