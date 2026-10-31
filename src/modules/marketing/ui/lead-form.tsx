"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

interface Props {
  kind: "team_waitlist" | "contact";
  compact?: boolean;
}

export const LeadForm = ({ kind, compact }: Props) => {
  const t = useTranslations("landing.lead");
  const locale = useLocale() === "en" ? "en" : "vi";
  const trpc = useTRPC();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState(false);

  const submit = useMutation(
    trpc.marketing.submitLead.mutationOptions({
      onSuccess: () => setSent(true),
      onError: () => toast.error(t("error")),
    }),
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.mutate({
      kind,
      email,
      name: name || undefined,
      message: message || undefined,
      locale,
      website: website || undefined,
    });
  };

  if (sent) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success" role="status">
        <CheckCircle2Icon className="size-4" />
        {t("success")}
      </p>
    );
  }

  const idPrefix = `lead-${kind}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {/* Honeypot, hidden from people and screen readers */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
      />
      {!compact && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-name`}>{t("name")}</Label>
          <Input id={`${idPrefix}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-email`} className={compact ? "sr-only" : undefined}>
          {t("email")}
        </Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-email`}
            type="email"
            required
            value={email}
            placeholder={compact ? t("email") : undefined}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={200}
          />
          {compact && (
            <Button type="submit" variant="outline" disabled={submit.isPending}>
              {t("submit")}
            </Button>
          )}
        </div>
      </div>
      {!compact && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-message`}>{t("message")}</Label>
            <Textarea
              id={`${idPrefix}-message`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              className="min-h-28"
            />
          </div>
          <Button type="submit" className="self-start" disabled={submit.isPending}>
            {t("submit")}
          </Button>
        </>
      )}
    </form>
  );
};
