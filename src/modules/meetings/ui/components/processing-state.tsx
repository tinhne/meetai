import { EmptyState } from "@/components/emty-state";

export const ProcessingState = () => {
  return (
    <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center">
      <EmptyState
        title="Meeting is processing"
        description="This meeting is currently being processed, a summary will appear soon"
        image="/processing.svg"
      />
    </div>
  );
};
