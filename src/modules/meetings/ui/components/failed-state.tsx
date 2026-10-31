import { EmptyState } from "@/components/emty-state";

interface Props {
  reason: string | null;
}

export const FailedState = ({ reason }: Props) => {
  return (
    <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center">
      <EmptyState
        title="We couldn't process this meeting"
        description={
          reason ?? "Something went wrong while generating the summary."
        }
        image="/cancelled.svg"
      />
    </div>
  );
};
