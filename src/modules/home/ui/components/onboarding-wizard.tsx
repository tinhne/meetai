"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon, LoaderIcon, PhoneCallIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REALTIME_VOICES } from "@/config/ai";
import { AGENT_TEMPLATES, type AgentPurpose } from "@/config/agent-templates";
import { useRouter } from "@/i18n/navigation";
import { TemplateIcon } from "@/modules/agents/ui/components/template-icon";
import { useTRPC } from "@/trpc/client";

const PURPOSES: AgentPurpose[] = ["team", "interview", "ielts", "learning", "sales"];
const TOTAL_STEPS = 3;

// First-run flow: pick a goal, get a ready-made agent, try a call.
export const OnboardingWizard = ({ onDone }: { onDone: () => void }) => {
  const t = useTranslations("onboarding");
  const tForm = useTranslations("agents.form");
  const locale = useLocale() === "en" ? "en" : "vi";
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState<AgentPurpose>("team");
  const template =
    AGENT_TEMPLATES.find((item) => item.purpose === purpose) ?? AGENT_TEMPLATES[0];
  const [name, setName] = useState("");
  const [voice, setVoice] = useState<string>(template.voice);
  const [agentId, setAgentId] = useState<string | null>(null);
  const agentName = name.trim() || template.name[locale];

  const createAgent = useMutation(
    trpc.agents.create.mutationOptions({
      onSuccess: (agent) => {
        setAgentId(agent.id);
        setStep(3);
        void queryClient.invalidateQueries(trpc.premium.getFreeUsage.queryOptions());
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const startCall = useMutation(
    trpc.meetings.createInstant.mutationOptions({
      onSuccess: (meeting) => router.push(`/call/${meeting.id}`),
      onError: (error) => toast.error(error.message),
    }),
  );

  const finish = () => {
    void queryClient.invalidateQueries(trpc.dashboard.getOverview.queryOptions());
    onDone();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border bg-card p-6 shadow-md md:p-8">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("step", { current: step, total: TOTAL_STEPS })}</span>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-8 rounded-full ${index < step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("purposeTitle")}</h1>
            <p className="text-muted-foreground">{t("purposeDescription")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("purposeTitle")}>
            {PURPOSES.map((item) => {
              const itemTemplate = AGENT_TEMPLATES.find((entry) => entry.purpose === item)!;
              const selected = purpose === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setPurpose(item);
                    setVoice(itemTemplate.voice);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/5" : ""}`}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TemplateIcon icon={itemTemplate.icon} className="size-4" />
                  </span>
                  <span className="font-medium">{t(`purposes.${item}`)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={finish}>
              {t("skip")}
            </Button>
            <Button onClick={() => setStep(2)}>
              {t("create")}
              <ArrowRightIcon />
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("agentTitle")}</h1>
            <p className="text-muted-foreground">{t("agentDescription")}</p>
          </div>
          <div className="flex items-start gap-4 rounded-xl border p-4">
            <GeneratedAvatar seed={agentName} variant="botttsNeutral" className="size-14 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{template.name[locale]}</p>
              <p className="text-sm text-muted-foreground">{template.description[locale]}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="onboarding-name">{tForm("name")}</Label>
              <Input
                id="onboarding-name"
                value={name}
                placeholder={template.name[locale]}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{tForm("voice")}</Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REALTIME_VOICES.map((option) => (
                    <SelectItem key={option} value={option} className="capitalize">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              {t("skip")}
            </Button>
            <Button
              disabled={createAgent.isPending}
              onClick={() =>
                createAgent.mutate({
                  name: agentName,
                  instructions: template.instructions[locale],
                  voice: voice as (typeof REALTIME_VOICES)[number],
                })
              }
            >
              {createAgent.isPending ? <LoaderIcon className="animate-spin" /> : null}
              {createAgent.isPending ? t("creating") : t("create")}
            </Button>
          </div>
        </>
      )}

      {step === 3 && agentId && (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <GeneratedAvatar seed={agentName} variant="botttsNeutral" className="size-16" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("tryTitle", { name: agentName })}
            </h1>
            <p className="max-w-md text-muted-foreground">{t("tryDescription")}</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button variant="ghost" onClick={finish}>
              {t("later")}
            </Button>
            <Button
              disabled={startCall.isPending}
              onClick={() =>
                startCall.mutate({
                  agentId,
                  name: t("testMeetingName", { name: agentName }),
                  language: purpose === "ielts" ? "en" : locale,
                })
              }
            >
              <PhoneCallIcon />
              {t("startCall")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
