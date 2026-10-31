import { MailIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SITE } from "@/config/site";
import { toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { LeadForm } from "@/modules/marketing/ui/lead-form";
import { PageHero } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.pages.contact" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: buildAlternates("/contact", locale),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "landing.pages.contact" });

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <section className="mx-auto max-w-xl px-4 py-14 md:px-6">
        <div className="rounded-xl border bg-card p-6">
          <LeadForm kind="contact" />
        </div>
        {SITE.contactEmail && (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <MailIcon className="size-4" aria-hidden />
            {t("emailLabel")}
            <a href={`mailto:${SITE.contactEmail}`} className="text-primary underline underline-offset-4">
              {SITE.contactEmail}
            </a>
          </p>
        )}
      </section>
    </>
  );
}
