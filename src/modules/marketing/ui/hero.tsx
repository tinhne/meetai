import { CheckIcon, FileTextIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AuthCta } from "./auth-cta";

const BAR_HEIGHTS = [40, 75, 55, 90, 60, 80, 45];

const HeroMock = () => {
  const t = useTranslations("landing.mock");

  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden>
      <div className="dark overflow-hidden rounded-2xl border bg-stage p-3 text-stage-foreground shadow-lg">
        <div className="mb-3 flex items-center gap-2 px-1 text-xs">
          <span className="font-medium">{t("meetingName")}</span>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-destructive">
            <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
            {t("recording")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {["Lan", "Nam", "Hà"].map((name, index) => (
            <div
              key={name}
              className="flex aspect-video items-end rounded-xl bg-stage-surface p-2 text-xs"
              style={{ backgroundImage: `radial-gradient(circle at 50% 40%, oklch(0.4 0.05 ${170 + index * 40} / 0.6), transparent 60%)` }}
            >
              {name}
            </div>
          ))}
          <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-ai/15 p-2 ring-2 ring-ai">
            <div className="flex h-8 items-end gap-1">
              {BAR_HEIGHTS.map((height, index) => (
                <span
                  key={index}
                  className="w-1.5 animate-pulse rounded-full bg-ai"
                  style={{ height: `${height}%`, animationDelay: `${index * 120}ms`, animationDuration: "900ms" }}
                />
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs text-ai">
              <SparklesIcon className="size-3" />
              Mia · {t("aiSpeaking")}
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-black/60 px-3 py-2 text-xs leading-relaxed">
          <p>
            <span className="font-semibold">Lan:</span> {t("caption")}
          </p>
          <p className="text-ai">
            <span className="font-semibold">Mia:</span> {t("answer")}
          </p>
        </div>
      </div>

      <div className="absolute -right-2 -bottom-8 w-60 animate-in rounded-xl border bg-card p-3 text-card-foreground shadow-lg fade-in slide-in-from-bottom-4 duration-700 sm:-right-8">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-success">
          <FileTextIcon className="size-3.5" />
          {t("notesTitle")}
        </p>
        <ul className="flex flex-col gap-1.5 text-xs">
          {[t("note1"), t("note2"), t("note3")].map((note) => (
            <li key={note} className="flex gap-1.5">
              <CheckIcon className="mt-0.5 size-3 shrink-0 text-primary" />
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const Hero = () => {
  const t = useTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[480px] max-w-4xl rounded-full bg-ai-gradient opacity-15 blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 md:px-6 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col gap-6 text-center lg:text-left">
          <span className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium lg:mx-0">
            <span className="size-2 rounded-full bg-primary" />
            {t("badge")}
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground text-balance">{t("subtitle")}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <AuthCta location="hero" size="lg" label={t("primaryCta")} />
            <Button asChild size="lg" variant="outline">
              <Link href="/#demo">{t("secondaryCta")}</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("noCard")}</p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
            {[t("trust1"), t("trust2"), t("trust3")].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-4 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <HeroMock />
      </div>
    </section>
  );
};
