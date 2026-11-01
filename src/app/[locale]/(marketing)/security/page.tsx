import { CheckIcon, KeyRoundIcon, LockIcon, ServerIcon, ShieldCheckIcon, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { PageHero } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string }>;
}

const ICONS: LucideIcon[] = [KeyRoundIcon, LockIcon, ShieldCheckIcon, ServerIcon];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.pages.security" });

  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: buildAlternates("/security", locale),
  };
}

export default async function SecurityPage({ params }: Props) {
  const { locale } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "landing.pages" });
  const sections = t.raw("security.sections") as { title: string; items: string[] }[];

  return (
    <>
      <PageHero title={t("security.title")} subtitle={t("security.subtitle")} />
      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-14 sm:grid-cols-2 md:px-6">
        {sections.map((section, index) => {
          const Icon = ICONS[index] ?? ShieldCheckIcon;
          return (
            <div key={section.title} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Icon className="size-5 text-primary" aria-hidden />
                {section.title}
              </h2>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-20 md:px-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">{t("security.reportTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("security.report")}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/legal/privacy">{t("legalLinks.privacy")}</Link>
            </Button>
            <Button asChild>
              <Link href="/contact">{t("contact.title")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
