"use client";

import { AlertCircleIcon, RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState = ({ title, description, onRetry }: Props) => {
  const t = useTranslations("common");

  return (
    <div
      role="alert"
      className="py-4 px-8 flex flex-1 items-center justify-center w-full text-center"
    >
      <div className="flex flex-col items-center justify-center gap-y-6 bg-card text-card-foreground rounded-xl border p-10 shadow-sm">
        <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircleIcon className="size-5 text-destructive" />
        </div>
        <div className="flex flex-col gap-y-2 text-center">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcwIcon />
            {t("tryAgain")}
          </Button>
        )}
      </div>
    </div>
  );
};
