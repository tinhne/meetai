import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { softwareApplicationSchema } from "@/modules/marketing/lib/structured-data";
import { FaqList } from "@/modules/marketing/ui/faq-section";
import { JsonLd } from "@/modules/marketing/ui/json-ld";
import { PricingSection } from "@/modules/marketing/ui/pricing-section";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.pages.pricing" });

  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: buildAlternates("/pricing", locale),
    openGraph: { title: t("metaTitle"), description: t("metaDescription") },
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(toAppLocale(locale));
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.pages.pricing" });

  return (
    <>
      <PricingSection headingLevel="h1" />
      <FaqList title={t("faqTitle")} items={t.raw("faq") as { question: string; answer: string }[]} />
      <JsonLd data={softwareApplicationSchema(locale, t("metaDescription"))} />
    </>
  );
}
