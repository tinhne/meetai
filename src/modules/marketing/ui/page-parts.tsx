import { ChevronRightIcon } from "lucide-react";
import Markdown from "react-markdown";

import { Link } from "@/i18n/navigation";
import { AuthCta } from "./auth-cta";

export type Crumb = { name: string; path: string };

// Breadcrumb trail; the last item is the current page.
export const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
    <ol className="flex flex-wrap items-center gap-1">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <li key={item.path} className="flex items-center gap-1">
            {last ? (
              <span aria-current="page" className="text-foreground">
                {item.name}
              </span>
            ) : (
              <>
                <Link href={item.path} className="hover:text-foreground">
                  {item.name}
                </Link>
                <ChevronRightIcon className="size-3.5" aria-hidden />
              </>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export const PageHero = ({
  title,
  subtitle,
  crumbs,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) => (
  <section className="border-b bg-muted/30">
    <div className="mx-auto max-w-4xl px-4 py-14 md:px-6 md:py-20">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-4 max-w-2xl text-lg text-muted-foreground text-balance">{subtitle}</p>}
      {children}
    </div>
  </section>
);

// Long-form markdown (blog posts, legal pages).
export const Prose = ({ children }: { children: string }) => (
  <div className="text-base leading-relaxed">
    <Markdown
      components={{
        h2: (props) => <h2 className="mt-10 mb-3 text-2xl font-semibold tracking-tight first:mt-0" {...props} />,
        h3: (props) => <h3 className="mt-6 mb-2 text-lg font-semibold" {...props} />,
        p: (props) => <p className="mb-4" {...props} />,
        ul: (props) => <ul className="mb-4 list-disc space-y-1.5 pl-6" {...props} />,
        ol: (props) => <ol className="mb-4 list-decimal space-y-1.5 pl-6" {...props} />,
        strong: (props) => <strong className="font-semibold" {...props} />,
        a: (props) => <a className="text-primary underline underline-offset-4" {...props} />,
      }}
    >
      {children}
    </Markdown>
  </div>
);

export const CtaBand = ({ title, subtitle, location }: { title: string; subtitle: string; location: string }) => (
  <section className="px-4 py-16">
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-3xl bg-sidebar px-6 py-12 text-center text-sidebar-foreground">
      <h2 className="text-2xl font-bold tracking-tight text-sidebar-accent-foreground text-balance md:text-3xl">
        {title}
      </h2>
      <p className="max-w-xl text-balance">{subtitle}</p>
      <AuthCta
        location={location}
        size="lg"
        className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
      />
    </div>
  </section>
);

export function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(date));
}
