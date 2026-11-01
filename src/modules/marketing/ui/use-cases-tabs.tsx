"use client";

import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { USE_CASES } from "@/content/use-cases";
import { Link } from "@/i18n/navigation";
import { TemplateIcon } from "@/modules/agents/ui/components/template-icon";
import { SectionHeading } from "./landing-sections";

export const UseCasesTabs = () => {
  const t = useTranslations("landing.useCases");
  const locale = useLocale() === "en" ? "en" : "vi";

  return (
    <section id="use-cases" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-6">
      <SectionHeading title={t("title")} subtitle={t("subtitle")} />
      <Tabs defaultValue={USE_CASES[0].slug} className="gap-6">
        <TabsList className="mx-auto flex h-auto w-full max-w-3xl flex-wrap justify-center">
          {USE_CASES.map((useCase) => (
            <TabsTrigger key={useCase.slug} value={useCase.slug} className="gap-1.5">
              <TemplateIcon icon={useCase.icon} className="size-4" />
              {useCase.title[locale]}
            </TabsTrigger>
          ))}
        </TabsList>
        {USE_CASES.map((useCase) => (
          <TabsContent key={useCase.slug} value={useCase.slug}>
            <div className="grid items-center gap-8 rounded-2xl border bg-card p-6 md:grid-cols-2 md:p-10">
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-semibold tracking-tight">{useCase.heroTitle[locale]}</h3>
                <p className="text-muted-foreground">{useCase.heroSubtitle[locale]}</p>
                <Button asChild variant="outline" className="self-start">
                  <Link href={`/use-cases/${useCase.slug}`}>
                    {t("learnMore")}
                    <ArrowRightIcon />
                  </Link>
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {useCase.bullets[locale].map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};
