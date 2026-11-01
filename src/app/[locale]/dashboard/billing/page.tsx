import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { BillingView, BillingViewError, BillingViewLoading } from "@/modules/billing/ui/views/billing-view";
import { requireSession } from "@/server/session";
import { getQueryClient, trpc } from "@/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("title"), robots: { index: false } };
}

const Page = async () => {
  await requireSession();

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.billing.getOverview.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<BillingViewLoading />}>
        <ErrorBoundary fallback={<BillingViewError />}>
          <BillingView />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;
