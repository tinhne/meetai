"use client";

import { MenuIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthCta } from "./auth-cta";

const LINKS = [
  { key: "features", href: "/#features" },
  { key: "useCases", href: "/#use-cases" },
  { key: "pricing", href: "/pricing" },
  { key: "faq", href: "/#faq" },
  { key: "blog", href: "/blog" },
] as const;

export const MarketingNavbar = () => {
  const t = useTranslations("landing.nav");
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="" aria-hidden width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">Meet.AI</span>
        </Link>
        <ul className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          {LINKS.map((link) => (
            <li key={link.key}>
              <Link href={link.href} className="transition-colors hover:text-foreground">
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          {!session && (
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/sign-in">{t("signIn")}</Link>
            </Button>
          )}
          <AuthCta location="navbar" size="sm" className="hidden sm:inline-flex" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu")}>
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
              <ul className="mt-10 flex flex-col gap-1 px-4">
                {LINKS.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2 hover:bg-accent"
                    >
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
                {!session && (
                  <li>
                    <Link href="/sign-in" className="block rounded-lg px-3 py-2 hover:bg-accent">
                      {t("signIn")}
                    </Link>
                  </li>
                )}
              </ul>
              <div className="px-4 pt-4">
                <AuthCta location="mobile-menu" className="w-full" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};
