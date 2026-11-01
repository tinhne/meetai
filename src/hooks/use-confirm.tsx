import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type JSX,
} from "react";
import { useTranslations } from "next-intl";

import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { createConfirmStore, type ConfirmOptions, type ConfirmStore } from "./confirm-store";

type ConfirmFn = () => Promise<boolean>;



const ConfirmationDialogView = ({ store }: { store: ConfirmStore }) => {
  const t = useTranslations("confirm");
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);

  return (
    <ResponsiveDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) store.settle(false);
      }}
      title={state.title}
      description={state.description}
    >
      <div className="pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => store.settle(false)}>
          {t("cancel")}
        </Button>
        <Button
          variant={state.destructive ? "destructive" : "default"}
          onClick={() => store.settle(true)}
        >
          {state.confirmLabel ?? t("confirm")}
        </Button>
      </div>
    </ResponsiveDialog>
  );
};

export const useConfirm = (
  title: string,
  description: string,
  options: ConfirmOptions = {},
): [() => JSX.Element, ConfirmFn] => {
  const { confirmLabel, destructive } = options;
  const [store] = useState(() =>
    createConfirmStore({ open: false, title, description, confirmLabel, destructive }),
  );

  // Keep the texts current (e.g. after a language switch).
  useEffect(() => {
    store.update({ title, description, confirmLabel, destructive });
  }, [store, title, description, confirmLabel, destructive]);

  // Resolve a pending confirmation when the component unmounts.
  useEffect(() => () => store.settle(false), [store]);

  const ConfirmationDialog = useCallback(
    () => <ConfirmationDialogView store={store} />,
    [store],
  );

  return [ConfirmationDialog, store.ask];
};
