"use client";

import { CheckIcon, LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export const useSwitchLocale = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (locale: AppLocale) => {
    // Read the query at click time (keeps filters) without needing a
    // Suspense boundary for useSearchParams on static pages.
    const query = window.location.search;
    startTransition(() => {
      router.replace(`${pathname}${query}`, { locale });
    });
  };

  return { switchLocale, isPending };
};

export const LocaleSwitcher = () => {
  const t = useTranslations("language");
  const locale = useLocale();
  const { switchLocale, isPending } = useSwitchLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={t("switch")}
          disabled={isPending}
        >
          <LanguagesIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => switchLocale(option)}
            className="justify-between gap-6"
          >
            {t(option)}
            {option === locale && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
