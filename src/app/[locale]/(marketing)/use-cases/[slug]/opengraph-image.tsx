import { getUseCase } from "@/content/use-cases";
import { toAppLocale } from "@/i18n/routing";
import { OG_SIZE, renderOgImage } from "@/modules/marketing/lib/og";

export const alt = "Meet.AI";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const lang = toAppLocale(locale);
  const useCase = getUseCase(slug);
  return renderOgImage({
    eyebrow: useCase?.title[lang] ?? "Meet.AI",
    title: useCase?.heroTitle[lang] ?? "Meet.AI",
  });
}
