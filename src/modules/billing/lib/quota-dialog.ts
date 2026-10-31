// Client-side bridge between tRPC quota errors and the upgrade dialog.

import type { QuotaInfo } from "@/server/billing/quota-rules";

export function getQuotaInfo(error: unknown): QuotaInfo | null {
  if (typeof error !== "object" || error === null || !("data" in error)) return null;
  const data = (error as { data?: { quota?: QuotaInfo | null } | null }).data;
  return data?.quota ?? null;
}

// Tiny external store so any mutation can open the single dialog instance.
let current: QuotaInfo | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const quotaDialogStore = {
  open(info: QuotaInfo) {
    current = info;
    emit();
  },
  close() {
    current = null;
    emit();
  },
  get: () => current,
  getServer: () => null,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
