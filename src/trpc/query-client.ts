import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
} from '@tanstack/react-query';

import { getQuotaInfo, quotaDialogStore } from '@/modules/billing/lib/quota-dialog';

export function makeQueryClient() {
  return new QueryClient({
    // Any mutation that hits a plan quota opens the upgrade dialog.
    mutationCache: new MutationCache({
      onError: (error) => {
        const quota = getQuotaInfo(error);
        if (quota) quotaDialogStore.open(quota);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        // serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        // deserializeData: superjson.deserialize,
      },
    },
  });
}
