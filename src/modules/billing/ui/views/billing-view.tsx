"use client";

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckIcon, CreditCardIcon, MicIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useMessages, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageMeter } from "@/components/usage-meter";
import { PLANS, type PlanLimits } from "@/config/plans";
import { usePathname, useRouter } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

// Polar amounts are in minor units (cents).
function useMoney() {
  const locale = useLocale();
  return (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
}

const COMPARE_ROWS = [
  "meetingsPerMonth",
  "recordingMinutesPerMonth",
  "aiVoiceMinutesPerMonth",
  "maxAgents",
  "maxParticipants",
  "askAiPerHour",
  "recordingRetentionDays",
  "knowledgeDocuments",
] as const satisfies readonly (keyof PlanLimits)[];

const checkout = (productId: string, source: string) => {
  track("upgrade_clicked", { source });
  void authClient.checkout({ products: [productId] });
};

export const BillingView = () => {
  const t = useTranslations("billing");
  const format = useFormatter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const money = useMoney();
  const messages = useMessages();

  const { data: overview } = useSuspenseQuery(trpc.billing.getOverview.queryOptions());
  const products = useQuery(trpc.billing.getProducts.queryOptions());
  const orders = useQuery(trpc.billing.getOrders.queryOptions());

  const sync = useMutation(
    trpc.billing.sync.mutationOptions({
      onSuccess: async (_data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.billing.getOverview.queryOptions()),
          queryClient.invalidateQueries(trpc.billing.getOrders.queryOptions()),
        ]);
        toast.success(variables?.reason === "checkout" ? t("checkoutSuccess") : t("synced"));
      },
      onError: () => toast.error(t("syncFailed")),
    }),
  );

  // Back from Polar checkout: pull the new state right away instead of
  // waiting for the webhook, then drop the query param.
  const checkoutId = searchParams.get("checkout_id");
  const handledCheckout = useRef(false);
  useEffect(() => {
    if (!checkoutId || handledCheckout.current) return;
    handledCheckout.current = true;
    track("checkout_completed");
    sync.mutate({ reason: "checkout" });
    router.replace(pathname);
  }, [checkoutId, pathname, router, sync]);

  const { plan, subscription, usage } = overview;
  const isPaid = plan.id !== "free";
  const formatDate = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  // Labels for values that come from Polar (unknown ones are shown as is).
  const lookup = (group: "status" | "interval" | "orderStatus", value: string | null | undefined) => {
    const labels: Record<string, string> = messages.billing[group];
    return (value && labels[value]) || value || "";
  };

  const limitLabel = (key: (typeof COMPARE_ROWS)[number], value: number | null) => {
    if (value === null) return t("compare.unlimited");
    if (key === "recordingRetentionDays") return t("compare.days", { count: value });
    if (value === 0) return t("compare.none");
    return format.number(value);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate({ reason: "manual" })}
          >
            <RefreshCwIcon className={cn(sync.isPending && "animate-spin")} />
            {t("sync")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>{t("currentPlan")}</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {t(`plans.${plan.id}`)}
              {subscription && (
                <Badge variant={subscription.status === "past_due" ? "destructive" : "secondary"}>
                  {lookup("status", subscription.status)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {subscription?.currentPeriodEnd
                ? t(subscription.cancelAtPeriodEnd ? "endsOn" : "renewsOn", {
                    date: formatDate(subscription.currentPeriodEnd),
                  })
                : t("freeForever")}
            </p>
            {subscription?.status === "past_due" && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{t("pastDueHint")}</p>
            )}
            {isPaid ? (
              <Button variant="outline" onClick={() => void authClient.customer.portal()}>
                <CreditCardIcon />
                {t("manage")}
              </Button>
            ) : products.isPending ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              products.data?.plans.map((product) => (
                <Button key={product.id} onClick={() => checkout(product.id, "billing_plan_card")}>
                  <SparklesIcon />
                  {product.price
                    ? t("upgradeTo", {
                        price: money(product.price.amount, product.price.currency),
                        interval: lookup("interval", product.interval),
                      })
                    : t("upgrade")}
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("usageTitle")}</CardTitle>
            <CardDescription>{t("usageResets")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <UsageMeter label={t("usage.meetings")} used={usage.meetings.used} limit={usage.meetings.limit} />
            <UsageMeter
              label={t("usage.recordingMinutes")}
              used={usage.recordingMinutes.used}
              limit={usage.recordingMinutes.limit}
            />
            <UsageMeter label={t("usage.agents")} used={usage.agents.used} limit={usage.agents.limit} />
            <div className="flex flex-col gap-1">
              <UsageMeter
                label={t("usage.aiVoice")}
                used={usage.aiVoice.usedMinutes}
                limit={usage.aiVoice.includedMinutes + usage.aiVoice.creditMinutes}
              />
              {usage.aiVoice.creditMinutes > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("usage.credits", { minutes: usage.aiVoice.creditMinutes })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("compareTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("compare.feature")}</TableHead>
                {(["free", "pro"] as const).map((id) => (
                  <TableHead key={id} className={cn("text-right", plan.id === id && "text-primary")}>
                    {t(`plans.${id}`)}
                    {plan.id === id && <CheckIcon className="ml-1 inline size-4" aria-hidden />}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARE_ROWS.map((key) => (
                <TableRow key={key}>
                  <TableCell>{t(`compare.${key}`)}</TableCell>
                  <TableCell className="text-right tabular-nums">{limitLabel(key, PLANS.free[key])}</TableCell>
                  <TableCell className="text-right tabular-nums">{limitLabel(key, PLANS.pro[key])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card id="packs" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>{t("packsTitle")}</CardTitle>
          <CardDescription>{t("packsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {products.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : products.isError ? (
            <p className="text-sm text-muted-foreground">{t("productsError")}</p>
          ) : products.data.voicePacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("packsUnavailable")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.data.voicePacks.map((pack) => (
                <div key={pack.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-ai/10 text-ai">
                      <MicIcon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-medium">{t("packMinutes", { minutes: pack.minutes })}</p>
                      {pack.price && (
                        <p className="text-sm text-muted-foreground">
                          {money(pack.price.amount, pack.price.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => checkout(pack.id, "billing_voice_pack")}>
                    {t("buy")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ordersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {orders.isPending ? (
            <Skeleton className="h-24" />
          ) : !orders.data?.length ? (
            <EmptyState title={t("ordersEmpty")} className="py-6" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.date")}</TableHead>
                  <TableHead>{t("orders.item")}</TableHead>
                  <TableHead className="text-right">{t("orders.amount")}</TableHead>
                  <TableHead className="text-right">{t("orders.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>{order.productName}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(order.amount, order.currency)}</TableCell>
                    <TableCell className="text-right">
                      {lookup("orderStatus", order.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("paymentNote")}</p>
    </div>
  );
};

export const BillingViewLoading = () => (
  <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
    <Skeleton className="h-10 w-64" />
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-48" />
      <Skeleton className="h-48 lg:col-span-2" />
    </div>
    <Skeleton className="h-72" />
  </div>
);

export const BillingViewError = () => {
  const t = useTranslations("billing");
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <ErrorState title={t("loadError")} />
    </div>
  );
};
