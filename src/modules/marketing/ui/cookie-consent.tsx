"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CONSENT_KEY, initAnalytics } from "@/lib/analytics";

export const CookieConsent = () => {
  const t = useTranslations("landing.cookie");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CONSENT_KEY);
    } catch {
      stored = "declined";
    }
    if (stored === "accepted") initAnalytics();
    // Read once after mount (localStorage is client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else if (!stored) setVisible(true);
  }, []);

  const choose = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // storage unavailable: just hide the banner
    }
    if (value === "accepted") initAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("text")}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-sm">
        {t("text")}{" "}
        <Link href="/legal/cookies" className="underline underline-offset-4">
          {t("learnMore")}
        </Link>
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => choose("declined")}>
          {t("decline")}
        </Button>
        <Button size="sm" onClick={() => choose("accepted")}>
          {t("accept")}
        </Button>
      </div>
    </div>
  );
};
