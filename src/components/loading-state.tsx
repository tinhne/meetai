import { Loader2Icon } from "lucide-react";

interface Props {
  title: string;
  description?: string;
}

export const LoadingState = ({ title, description }: Props) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="py-4 px-8 flex flex-1 items-center justify-center w-full text-center"
    >
      <div className="flex flex-col items-center justify-center gap-y-6 bg-card text-card-foreground rounded-xl border p-10 shadow-sm">
        <Loader2Icon className="size-6 animate-spin text-primary" />
        <div className="flex flex-col gap-y-2 text-center">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
