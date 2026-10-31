import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CHANGELOG } from "@/content/changelog";
import { toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { PageHero, formatDate } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.pages.changelog" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: buildAlternates("/changelog", locale),
  };
}

export default async function ChangelogPage({ params }: Props) {
  const { locale } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "landing.pages.changelog" });

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <ol className="mx-auto flex max-w-3xl flex-col px-4 py-14 md:px-6">
        {CHANGELOG.map((entry) => (
          <li key={entry.date} className="relative border-l pb-10 pl-6 last:pb-0">
            <span className="absolute top-1.5 -left-1.5 size-3 rounded-full bg-primary" aria-hidden />
            <time dateTime={entry.date} className="text-sm text-muted-foreground">
              {formatDate(entry.date, lang)}
            </time>
            <h2 className="mt-1 mb-3 text-xl font-semibold tracking-tight">{entry.title[lang]}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              {entry.items[lang].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}
