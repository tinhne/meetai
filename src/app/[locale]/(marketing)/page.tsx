import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { toAppLocale } from "@/i18n/routing";

import { buildAlternates } from "@/lib/seo";
import { softwareApplicationSchema } from "@/modules/marketing/lib/structured-data";
import { FaqSection } from "@/modules/marketing/ui/faq-section";
import { Hero } from "@/modules/marketing/ui/hero";
import { InteractiveDemo } from "@/modules/marketing/ui/interactive-demo";
import { JsonLd } from "@/modules/marketing/ui/json-ld";
import {
  BuiltWith,
  Features,
  FinalCta,
  HowItWorks,
  Problems,
  Security,
} from "@/modules/marketing/ui/landing-sections";
import { PricingSection } from "@/modules/marketing/ui/pricing-section";
import { UseCasesTabs } from "@/modules/marketing/ui/use-cases-tabs";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.meta" });

  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildAlternates("/", locale),
    openGraph: { title: t("title"), description: t("description"), type: "website" },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(toAppLocale(locale));
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.meta" });

  return (
    <>
      <Hero />
      <BuiltWith />
      <Problems />
      <HowItWorks />
      <Features />
      <UseCasesTabs />
      <InteractiveDemo />
      <PricingSection />
      <Security />
      <FaqSection />
      <FinalCta />
      <JsonLd data={softwareApplicationSchema(locale, t("description"))} />
    </>
  );
}
