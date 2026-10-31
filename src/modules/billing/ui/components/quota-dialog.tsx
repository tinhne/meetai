"use client";

import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { quotaDialogStore } from "../../lib/quota-dialog";

// Mounted once in the dashboard; opened by any quota error (see query-client).
export const QuotaDialog = () => {
  const t = useTranslations("quota");
  const tPlans = useTranslations("billing.plans");
  const info = useSyncExternalStore(
    quotaDialogStore.subscribe,
    quotaDialogStore.get,
    quotaDialogStore.getServer,
  );

  useEffect(() => {
    if (info) track("quota_dialog_shown", { kind: info.kind, plan: info.planId });
  }, [info]);

  const close = () => quotaDialogStore.close();
  const isVoice = info?.kind === "aiVoice";

  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        {info && (
          <>
            <DialogHeader>
              <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-ai/10 text-ai">
                <SparklesIcon className="size-5" aria-hidden />
              </span>
              <DialogTitle>{t(`title.${info.kind}`)}</DialogTitle>
              <DialogDescription>
                {t("description", {
                  used: info.used,
                  limit: info.limit ?? "∞",
                  plan: tPlans(info.planId),
                  voice: isVoice ? "yes" : "no",
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={close}>
                {t("later")}
              </Button>
              {isVoice && (
                <Button variant="outline" asChild onClick={close}>
                  <Link href="/dashboard/billing#packs">{t("buyMinutes")}</Link>
                </Button>
              )}
              <Button
                asChild
                onClick={() => {
                  track("upgrade_clicked", { source: "quota_dialog", kind: info.kind });
                  close();
                }}
              >
                <Link href="/dashboard/billing">{t("upgrade")}</Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
