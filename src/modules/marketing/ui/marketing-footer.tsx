import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { USE_CASES } from "@/content/use-cases";

export const MarketingFooter = ({ locale }: { locale: "vi" | "en" }) => {
  const t = useTranslations("landing.footer");
  const tNav = useTranslations("landing.nav");

  const columns = [
    {
      title: t("product"),
      links: [
        { href: "/#features", label: tNav("features") },
        { href: "/pricing", label: tNav("pricing") },
        { href: "/changelog", label: t("changelog") },
        { href: "/security", label: t("security") },
      ],
    },
    {
      title: t("solutions"),
      links: USE_CASES.map((useCase) => ({
        href: `/use-cases/${useCase.slug}`,
        label: useCase.title[locale],
      })),
    },
    {
      title: t("resources"),
      links: [
        { href: "/blog", label: tNav("blog") },
        { href: "/about", label: t("about") },
        { href: "/contact", label: t("contact") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/legal/terms", label: t("terms") },
        { href: "/legal/privacy", label: t("privacy") },
        { href: "/legal/cookies", label: t("cookies") },
      ],
    },
  ];

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(4,1fr)] md:px-6">
        <div className="flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="" aria-hidden width={26} height={26} />
            <span className="font-semibold">Meet.AI</span>
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground md:px-6">
          {t("rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
};
