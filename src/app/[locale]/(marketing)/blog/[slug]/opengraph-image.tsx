import { getBlogPost } from "@/content/blog";
import { toAppLocale } from "@/i18n/routing";
import { OG_SIZE, renderOgImage } from "@/modules/marketing/lib/og";

export const alt = "Meet.AI blog";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const lang = toAppLocale(locale);
  const post = getBlogPost(slug);
  return renderOgImage({ eyebrow: "Blog", title: post?.title[lang] ?? "Meet.AI" });
}
