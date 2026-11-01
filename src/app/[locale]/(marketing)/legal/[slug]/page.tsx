import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LEGAL_PAGES, getLegalPage } from "@/content/legal";
import { routing, toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { PageHero, Prose, formatDate } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => LEGAL_PAGES.map((page) => ({ locale, slug: page.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = getLegalPage(slug);
  if (!page) return {};
  const lang = toAppLocale(locale);

  return {
    title: page.title[lang],
    description: page.description[lang],
    alternates: buildAlternates(`/legal/${slug}`, locale),
  };
}

export default async function LegalPage({ params }: Props) {
  const { locale, slug } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const page = getLegalPage(slug);
  if (!page) notFound();

  const t = await getTranslations({ locale: lang, namespace: "landing.pages.legal" });

  return (
    <>
      <PageHero title={page.title[lang]} subtitle={t("updated", { date: formatDate(page.updated, lang) })} />
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <p className="mb-8 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          {t("draft")}
        </p>
        <Prose>{page.body[lang]}</Prose>
      </div>
    </>
  );
}
