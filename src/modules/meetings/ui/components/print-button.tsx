"use client";

import { PrinterIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export const PrintButton = () => {
  const t = useTranslations("notes.export");
  return (
    <Button onClick={() => window.print()}>
      <PrinterIcon />
      {t("print")}
    </Button>
  );
};
