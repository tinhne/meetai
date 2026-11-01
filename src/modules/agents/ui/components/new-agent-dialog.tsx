"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ResponsiveDialog } from "@/components/responsive-dialog";
import type { AgentTemplate } from "@/config/agent-templates";
import { useRouter } from "@/i18n/navigation";
import { AgentForm } from "./agent-form";
import { AgentTemplateGallery } from "./agent-template-gallery";

interface NewAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Stay on the current page after creating (e.g. from the meeting form).
  stayOnPage?: boolean;
}

export const NewAgentDialog = ({ open, onOpenChange, stayOnPage }: NewAgentDialogProps) => {
  const t = useTranslations("agents");
  const locale = useLocale() === "en" ? "en" : "vi";
  const router = useRouter();
  const [step, setStep] = useState<"gallery" | "form">("gallery");
  const [template, setTemplate] = useState<AgentTemplate | null>(null);

  const close = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setStep("gallery");
      setTemplate(null);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={step === "gallery" ? t("gallery.title") : t("newTitle")}
      description={step === "gallery" ? t("gallery.description") : ""}
    >
      {step === "gallery" ? (
        <AgentTemplateGallery
          onSelect={(selected) => {
            setTemplate(selected);
            setStep("form");
          }}
        />
      ) : (
        <AgentForm
          defaults={
            template
              ? {
                  name: template.name[locale],
                  instructions: template.instructions[locale],
                  voice: template.voice as "alloy",
                }
              : undefined
          }
          onBack={() => setStep("gallery")}
          onSuccess={(id) => {
            close(false);
            if (!stayOnPage) router.push(`/dashboard/agents/${id}`);
          }}
        />
      )}
    </ResponsiveDialog>
  );
};
