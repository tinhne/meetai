import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BLOG_POSTS } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { toAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { PageHero, formatDate } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toAppLocale(locale), namespace: "landing.pages.blog" });

  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: buildAlternates("/blog", locale),
    openGraph: { title: t("metaTitle"), description: t("metaDescription") },
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "landing.pages.blog" });
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <section className="mx-auto grid max-w-4xl gap-4 px-4 py-14 md:px-6">
        {posts.map((post) => (
          <article key={post.slug} className="group relative flex flex-col gap-2 rounded-xl border bg-card p-6 transition-colors hover:border-primary/40">
            <time dateTime={post.date} className="text-sm text-muted-foreground">
              {formatDate(post.date, lang)}
            </time>
            <h2 className="text-xl font-semibold tracking-tight">
              <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                {post.title[lang]}
              </Link>
            </h2>
            <p className="text-muted-foreground">{post.description[lang]}</p>
            <span className="flex items-center gap-1 text-sm font-medium text-primary">
              {t("readMore")}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </article>
        ))}
      </section>
    </>
  );
}
