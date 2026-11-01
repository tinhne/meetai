import {
  BarChart3Icon,
  BotIcon,
  CaptionsIcon,
  FileTextIcon,
  KeyRoundIcon,
  ListTodoIcon,
  LockIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  TrashIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AuthCta } from "./auth-cta";

type Item = { title: string; description: string };

export const SectionHeading = ({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) => (
  <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-3 text-center">
    <h2 id={id} className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
      {title}
    </h2>
    {subtitle && <p className="text-muted-foreground text-balance">{subtitle}</p>}
  </div>
);

export const BuiltWith = () => {
  const t = useTranslations("landing");
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-center sm:gap-8">
        <span>{t("builtWith")}</span>
        <span className="flex flex-wrap justify-center gap-6 font-semibold text-foreground/70">
          <span>Stream</span>
          <span>OpenAI</span>
          <span>Google Gemini</span>
          <span>Neon</span>
        </span>
      </div>
    </section>
  );
};

export const Problems = () => {
  const t = useTranslations("landing.problems");
  const items = t.raw("items") as Item[];

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <SectionHeading title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-6">
            <h3 className="mb-2 font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <h3 className="mb-1 text-lg font-semibold text-primary">{t("solutionTitle")}</h3>
        <p className="text-muted-foreground">{t("solution")}</p>
      </div>
    </section>
  );
};

export const HowItWorks = () => {
  const t = useTranslations("landing.how");
  const steps = t.raw("steps") as Item[];

  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading title={t("title")} />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-xl border bg-card p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const FEATURE_ICONS: LucideIcon[] = [
  BotIcon,
  FileTextIcon,
  ListTodoIcon,
  MessageSquareTextIcon,
  CaptionsIcon,
  BarChart3Icon,
];

export const Features = () => {
  const t = useTranslations("landing.features");
  const items = t.raw("items") as Item[];

  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-6">
      <SectionHeading title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const Icon = FEATURE_ICONS[index] ?? BotIcon;
          const isAi = index === 0 || index === 3;
          return (
            <div
              key={item.title}
              className={`flex flex-col gap-3 rounded-xl border bg-card p-6 transition-colors hover:border-primary/40 ${index === 0 ? "lg:col-span-2" : ""}`}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-lg ${isAi ? "bg-ai/10 text-ai" : "bg-primary/10 text-primary"}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const SECURITY_ICONS: LucideIcon[] = [ShieldCheckIcon, LockIcon, KeyRoundIcon, TrashIcon];

export const Security = () => {
  const t = useTranslations("landing.security");
  const items = t.raw("items") as Item[];

  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = SECURITY_ICONS[index] ?? ShieldCheckIcon;
            return (
              <div key={item.title} className="flex flex-col gap-2 rounded-xl border bg-card p-5">
                <Icon className="size-5 text-primary" aria-hidden />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link href="/security">{t("cta")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export const FinalCta = () => {
  const t = useTranslations("landing.finalCta");
  return (
    <section className="px-4 py-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-3xl bg-sidebar px-6 py-14 text-center text-sidebar-foreground">
        <h2 className="text-3xl font-bold tracking-tight text-sidebar-accent-foreground text-balance md:text-4xl">
          {t("title")}
        </h2>
        <p className="max-w-xl text-balance">{t("subtitle")}</p>
        <AuthCta
          location="final-cta"
          size="lg"
          label={t("cta")}
          className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
        />
      </div>
    </section>
  );
};
