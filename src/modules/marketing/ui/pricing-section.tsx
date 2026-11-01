"use client";

import { CheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  monthlyEquivalent,
  PRICING_PLANS,
  VOICE_CREDIT_PACKS,
  type BillingCycle,
  type Currency,
} from "@/config/pricing";
import { formatPrice } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { AuthCta } from "./auth-cta";
import { SectionHeading } from "./landing-sections";
import { LeadForm } from "./lead-form";

export const PricingSection = ({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) => {
  const t = useTranslations("landing.pricing");
  const locale = useLocale();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<Currency>(locale === "en" ? "USD" : "VND");

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-6">
      {headingLevel === "h1" ? (
        <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      ) : (
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
      )}

      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        <Tabs value={cycle} onValueChange={(value) => setCycle(value as BillingCycle)}>
          <TabsList>
            <TabsTrigger value="monthly">{t("monthly")}</TabsTrigger>
            <TabsTrigger value="yearly">
              {t("yearly")}
              <Badge variant="secondary" className="ml-1.5 bg-success/15 text-success">
                {t("save")}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
          <TabsList>
            <TabsTrigger value="VND">VND</TabsTrigger>
            <TabsTrigger value="USD">USD</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => {
          // Yearly plans are billed once a year but compared per month.
          const billed = plan[cycle];
          const price = billed && cycle === "yearly" ? monthlyEquivalent(billed) : billed;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col gap-5 rounded-2xl border bg-card p-6",
                plan.highlighted && "border-primary shadow-lg ring-1 ring-primary",
              )}
            >
              {!plan.available && (
                <Badge variant="outline" className="absolute top-4 right-4">
                  {t("comingSoon")}
                </Badge>
              )}
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{t(`plans.${plan.id}.name`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`plans.${plan.id}.description`)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {price ? formatPrice(price[currency], currency, locale) : "—"}
                  </span>
                  {price && price[currency] > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {plan.id === "team" ? t("perSeat") : t("perMonth")}
                    </span>
                  )}
                </p>
                {cycle === "yearly" && billed && billed[currency] > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t(plan.id === "team" ? "billedYearlyPerSeat" : "billedYearly", {
                      price: formatPrice(billed[currency], currency, locale),
                    })}
                  </p>
                )}
              </div>
              {plan.available ? (
                <AuthCta
                  location={`pricing-${plan.id}`}
                  variant={plan.highlighted ? "default" : "outline"}
                  label={t(`plans.${plan.id}.cta`)}
                />
              ) : (
                <LeadForm kind="team_waitlist" compact />
              )}
              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {t(`features.${feature}`)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border bg-muted/40 p-6 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <h3 className="font-semibold">{t("creditsTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("creditsDescription")}</p>
        </div>
        <ul className="flex gap-3">
          {VOICE_CREDIT_PACKS.map((pack) => (
            <li key={pack.minutes} className="rounded-xl border bg-card px-4 py-2 text-center">
              <p className="text-sm font-semibold">{t("creditsPack", { minutes: pack.minutes })}</p>
              <p className="text-sm text-muted-foreground">{formatPrice(pack.price[currency], currency, locale)}</p>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">{t("vat")}</p>
    </section>
  );
};
