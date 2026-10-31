import { getTranslations } from "next-intl/server";

import { toAppLocale } from "@/i18n/routing";
import { OG_SIZE, renderOgImage } from "@/modules/marketing/lib/og";

export const alt = "Meet.AI";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.hero" });
  return renderOgImage({ eyebrow: t("badge"), title: t("title") });
}
