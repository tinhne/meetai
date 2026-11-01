"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const DataPagination = ({ page, totalPages, onPageChange }: Props) => {
  const t = useTranslations("table");
  const tCommon = useTranslations("common");
  const total = totalPages || 1;

  if (total <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-2" aria-label={tCommon("pagination")}>
      <p className="text-sm text-muted-foreground">{t("page", { page, total })}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeftIcon />
          {t("previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(page + 1, total))}
          disabled={page >= total}
        >
          {t("next")}
          <ChevronRightIcon />
        </Button>
      </div>
    </nav>
  );
};
