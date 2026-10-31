import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { CtaBand, PageHero } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.pages.about" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: buildAlternates("/about", locale),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "landing" });
  const body = t.raw("pages.about.body") as string[];
  const values = t.raw("pages.about.values") as { title: string; description: string }[];

  return (
    <>
      <PageHero title={t("pages.about.title")} subtitle={t("pages.about.lead")} />
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-14 text-lg leading-relaxed md:px-6">
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">{t("pages.about.valuesTitle")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {values.map((value) => (
              <div key={value.title} className="rounded-xl border bg-card p-6">
                <h3 className="mb-2 font-semibold">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand title={t("finalCta.title")} subtitle={t("finalCta.subtitle")} location="about" />
    </>
  );
}
