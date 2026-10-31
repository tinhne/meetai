"use client";

import { PenLineIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AGENT_TEMPLATES, type AgentTemplate } from "@/config/agent-templates";
import { TemplateIcon } from "./template-icon";

interface Props {
  onSelect: (template: AgentTemplate | null) => void;
}

export const AgentTemplateGallery = ({ onSelect }: Props) => {
  const t = useTranslations("agents.gallery");
  const locale = useLocale() === "en" ? "en" : "vi";

  return (
    <div className="grid gap-3 pt-2 sm:grid-cols-2">
      {AGENT_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelect(template)}
          className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TemplateIcon icon={template.icon} className="size-4" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{template.name[locale]}</span>
            <span className="text-xs text-muted-foreground">{template.description[locale]}</span>
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <PenLineIcon className="size-4" aria-hidden />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{t("custom")}</span>
          <span className="text-xs text-muted-foreground">{t("customDescription")}</span>
        </span>
      </button>
    </div>
  );
};
