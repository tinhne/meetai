"use client";

import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

interface Props extends Omit<ComponentProps<typeof Button>, "asChild"> {
  label?: string;
  location: string;
}

// The marketing pages are static; the signed-in state is decided here.
export const AuthCta = ({ label, location, ...props }: Props) => {
  const t = useTranslations("landing.nav");
  const { data: session } = authClient.useSession();

  return (
    <Button asChild {...props}>
      <Link
        href={session ? "/dashboard" : "/sign-up"}
        onClick={() => track("landing_cta_click", { location, signedIn: !!session })}
      >
        {session ? t("dashboard") : (label ?? t("getStarted"))}
        <ArrowRightIcon />
      </Link>
    </Button>
  );
};
