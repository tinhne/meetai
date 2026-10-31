import { CheckCircle2Icon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

// Two-column auth layout: form on the left, product pitch on the right.
export const AuthShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0 shadow-md">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">{children}</div>
          <div className="relative hidden flex-col justify-between gap-8 bg-sidebar p-8 text-sidebar-foreground md:flex">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="" aria-hidden width={32} height={32} />
              <span className="text-lg font-semibold text-sidebar-accent-foreground">
                Meet.AI
              </span>
            </div>
            <div className="flex flex-col gap-5">
              <p className="text-2xl font-semibold leading-snug text-sidebar-accent-foreground text-balance">
                {t("panel.title")}
              </p>
              <ul className="flex flex-col gap-3 text-sm">
                {(["point1", "point2", "point3"] as const).map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" />
                    <span>{t(`panel.${point}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -bottom-16 size-56 rounded-full bg-ai-gradient opacity-20 blur-3xl"
            />
          </div>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-center text-xs text-balance">
        {t("terms")}
      </p>
    </div>
  );
};

export const AuthCard = ({ children }: { children: ReactNode }) => (
  <Card className="mx-auto w-full max-w-md shadow-md">
    <CardContent className="p-6 md:p-8">{children}</CardContent>
  </Card>
);
