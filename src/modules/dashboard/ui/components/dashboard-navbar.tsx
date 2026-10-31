"use client";

import { PanelLeftCloseIcon, PanelLeftIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { DashboardCommand } from "./dashboard-command";

export const DashboardNavbar = () => {
  const t = useTranslations("nav");
  const { state, toggleSidebar, isMobile } = useSidebar();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const down = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      // "N" = new meeting, unless the user is typing somewhere.
      const target = e.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/dashboard/meetings?new=1");
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router]);

  return (
    <>
      <DashboardCommand open={commandOpen} setOpen={setCommandOpen} />
      <nav className="sticky top-0 z-10 flex items-center gap-x-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button
          className="size-9"
          variant="outline"
          onClick={toggleSidebar}
          aria-label={t("toggleSidebar")}
        >
          {state === "collapsed" || isMobile ? (
            <PanelLeftIcon className="size-4" />
          ) : (
            <PanelLeftCloseIcon className="size-4" />
          )}
        </Button>
        <Button
          className="h-9 w-full max-w-[260px] justify-start font-normal text-muted-foreground hover:text-muted-foreground"
          variant="outline"
          size="sm"
          onClick={() => setCommandOpen(true)}
        >
          <SearchIcon />
          <span className="truncate">{t("search")}</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-block">
            ⌘K
          </kbd>
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </>
  );
};
