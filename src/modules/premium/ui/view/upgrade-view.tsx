"use client";

import { useTranslations } from "next-intl";

import { CardGridSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PricingCard } from "../component/pricing-card";

export const UpgradeView = () => {
  const t = useTranslations("upgrade");
  const trpc = useTRPC();

  const { data: products } = useSuspenseQuery(
    trpc.premium.getProducts.queryOptions(),
  );

  const { data: currentSubscription } = useSuspenseQuery(
    trpc.premium.getCurrentSubscription.queryOptions(),
  );

  return (
    <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-10">
      <div className="mt-4 flex-1 flex flex-col gap-y-10 items-center">
        <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          {t("currentPlan", { plan: currentSubscription?.name ?? t("free") })}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((product) => {
            const isCurrentProduct = currentSubscription?.id === product.id;
            const isPremium = !!currentSubscription;

            let buttonText = t("upgrade");
            let onClick = () => authClient.checkout({ products: [product.id] });

            if (isCurrentProduct) {
              buttonText = t("manage");
              onClick = () => authClient.customer.portal();
            } else if (isPremium) {
              buttonText = t("changePlan");
              onClick = () => authClient.customer.portal();
            }
            return (
              <PricingCard
                key={product.id}
                title={product.name}
                description={product.description ?? undefined}
                price={
                  product.prices[0].amountType === "fixed"
                    ? product.prices[0].priceAmount / 100
                    : 0
                }
                buttonText={buttonText}
                onClick={onClick}
                features={product.benefits.map(
                  (benefit) => benefit.description,
                )}
                priceSuffix={`/${product.recurringInterval}`}
                variant={
                  product.metadata.variant === "highlighted"
                    ? "highlighted"
                    : "default"
                }
                badge={product.metadata.badge as string | null}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const UpgradeViewLoading = () => {
  return (
    <div className="flex-1 py-8 px-4 md:px-8">
      <CardGridSkeleton />
    </div>
  );
};

export const UpgradeViewError = () => {
  const t = useTranslations("upgrade");
  const tStates = useTranslations("states");
  return <ErrorState title={tStates("errorTitle")} description={t("loadError")} />;
};
