// State for useConfirm, kept outside React state (pure, unit tested).

export interface ConfirmOptions {
  confirmLabel?: string;
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  title: string;
  description: string;
}

// Dialog state lives outside React state so the returned dialog component can
// keep the same identity across parent re-renders. Otherwise a parent that
// re-renders constantly (e.g. the call room while the AI speaks) remounts the
// dialog and its open animation flickers.
export function createConfirmStore(initial: ConfirmState) {
  let state = initial;
  let resolver: ((value: boolean) => void) | null = null;
  const listeners = new Set<() => void>();

  const update = (patch: Partial<ConfirmState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  const settle = (value: boolean) => {
    resolver?.(value);
    resolver = null;
    if (state.open) update({ open: false });
  };

  return {
    get: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update,
    settle,
    ask: (): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        resolver?.(false);
        resolver = resolve;
        update({ open: true });
      }),
  };
}

export type ConfirmStore = ReturnType<typeof createConfirmStore>;
