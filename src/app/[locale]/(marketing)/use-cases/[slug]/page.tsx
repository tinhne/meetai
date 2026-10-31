import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { USE_CASES, getUseCase } from "@/content/use-cases";
import { Link } from "@/i18n/navigation";
import { routing, toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { TemplateIcon } from "@/modules/agents/ui/components/template-icon";
import { breadcrumbSchema } from "@/modules/marketing/lib/structured-data";
import { AuthCta } from "@/modules/marketing/ui/auth-cta";
import { FaqList } from "@/modules/marketing/ui/faq-section";
import { JsonLd } from "@/modules/marketing/ui/json-ld";
import { SectionHeading } from "@/modules/marketing/ui/landing-sections";
import { Breadcrumbs, CtaBand } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => USE_CASES.map((useCase) => ({ locale, slug: useCase.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) return {};
  const lang = toAppLocale(locale);

  return {
    title: { absolute: `${useCase.metaTitle[lang]} | Meet.AI` },
    description: useCase.metaDescription[lang],
    alternates: buildAlternates(`/use-cases/${slug}`, locale),
    openGraph: { title: useCase.metaTitle[lang], description: useCase.metaDescription[lang] },
  };
}

export default async function UseCasePage({ params }: Props) {
  const { locale, slug } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const useCase = getUseCase(slug);
  if (!useCase) notFound();

  const t = await getTranslations({ locale: lang, namespace: "landing.pages" });
  const crumbs = [
    { name: t("home"), path: "/" },
    { name: t("useCase.breadcrumb"), path: "/#use-cases" },
    { name: useCase.title[lang], path: `/use-cases/${slug}` },
  ];
  const others = USE_CASES.filter((item) => item.slug !== slug);

  return (
    <>
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <Breadcrumbs items={crumbs} />
          <div className="flex max-w-3xl flex-col gap-5">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TemplateIcon icon={useCase.icon} className="size-6" />
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
              {useCase.heroTitle[lang]}
            </h1>
            <p className="text-lg text-muted-foreground text-balance">{useCase.heroSubtitle[lang]}</p>
            <ul className="flex flex-col gap-2">
              {useCase.bullets[lang].map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                  {bullet}
                </li>
              ))}
            </ul>
            <AuthCta location={`use-case-${slug}`} size="lg" className="self-start" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <SectionHeading title={t("useCase.painsTitle")} />
        <ul className="grid gap-4 md:grid-cols-3">
          {useCase.pains[lang].map((pain) => (
            <li key={pain} className="flex gap-3 rounded-xl border bg-card p-5">
              <XIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
              <span className="text-muted-foreground">{pain}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeading title={t("useCase.benefitsTitle")} />
          <div className="grid gap-4 sm:grid-cols-2">
            {useCase.benefits[lang].map((benefit) => (
              <div key={benefit.title} className="flex flex-col gap-2 rounded-xl border bg-card p-6">
                <h3 className="font-semibold">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 md:px-6">
        <SectionHeading title={t("useCase.stepsTitle")} />
        <ol className="flex flex-col gap-4">
          {useCase.steps[lang].map((step, index) => (
            <li key={step} className="flex items-start gap-4 rounded-xl border bg-card p-5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <FaqList title={t("useCase.faqTitle")} items={useCase.faq[lang]} />

      <section className="mx-auto max-w-6xl px-4 pb-4 md:px-6">
        <h2 className="mb-4 text-lg font-semibold">{t("useCase.otherTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          {others.map((item) => (
            <Button key={item.slug} asChild variant="outline" size="sm">
              <Link href={`/use-cases/${item.slug}`}>
                <TemplateIcon icon={item.icon} className="size-4" />
                {item.title[lang]}
                <ArrowRightIcon />
              </Link>
            </Button>
          ))}
        </div>
      </section>

      <CtaBand
        title={t("useCase.ctaTitle")}
        subtitle={t("useCase.ctaSubtitle")}
        location={`use-case-${slug}-bottom`}
      />
      <JsonLd data={breadcrumbSchema(crumbs.filter((crumb) => !crumb.path.includes("#")), locale)} />
    </>
  );
}
