import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BLOG_POSTS, getBlogPost } from "@/content/blog";
import { SITE } from "@/config/site";
import { routing, toAppLocale } from "@/i18n/routing";
import { absoluteUrl, buildAlternates, localizedPath } from "@/lib/seo";
import { breadcrumbSchema } from "@/modules/marketing/lib/structured-data";
import { JsonLd } from "@/modules/marketing/ui/json-ld";
import { CtaBand, PageHero, Prose, formatDate } from "@/modules/marketing/ui/page-parts";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => BLOG_POSTS.map((post) => ({ locale, slug: post.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  const lang = toAppLocale(locale);

  return {
    title: post.title[lang],
    description: post.description[lang],
    alternates: buildAlternates(`/blog/${slug}`, locale),
    openGraph: {
      type: "article",
      title: post.title[lang],
      description: post.description[lang],
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const lang = toAppLocale(locale);
  setRequestLocale(lang);
  const post = getBlogPost(slug);
  if (!post) notFound();

  const t = await getTranslations({ locale: lang, namespace: "landing.pages" });
  const path = `/blog/${slug}`;
  const crumbs = [
    { name: t("home"), path: "/" },
    { name: t("blog.title"), path: "/blog" },
    { name: post.title[lang], path },
  ];

  return (
    <>
      <PageHero title={post.title[lang]} subtitle={post.description[lang]} crumbs={crumbs}>
        <time dateTime={post.date} className="mt-6 block text-sm text-muted-foreground">
          {formatDate(post.date, lang)}
        </time>
      </PageHero>
      <article className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <Prose>{post.body[lang]}</Prose>
      </article>
      <CtaBand title={t("blog.ctaTitle")} subtitle={t("blog.ctaSubtitle")} location={`blog-${slug}`} />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title[lang],
            description: post.description[lang],
            datePublished: post.date,
            inLanguage: lang,
            mainEntityOfPage: absoluteUrl(localizedPath(path, lang)),
            author: { "@type": "Organization", name: SITE.name },
            publisher: { "@type": "Organization", name: SITE.name, logo: absoluteUrl(SITE.logo) },
          },
          breadcrumbSchema(crumbs, lang),
        ]}
      />
    </>
  );
}
