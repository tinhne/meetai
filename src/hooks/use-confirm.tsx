import { useEffect, useRef, useState, type JSX } from "react";
import { useTranslations } from "next-intl";

import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";

type ConfirmFn = () => Promise<boolean>;

interface ConfirmOptions {
  confirmLabel?: string;
  destructive?: boolean;
}

export const useConfirm = (
  title: string,
  description: string,
  options: ConfirmOptions = {},
): [() => JSX.Element, ConfirmFn] => {
  const t = useTranslations("confirm");
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = () => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpen(true);
    });
  };

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  };

  // Resolve pending confirmations when the component unmounts.
  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const ConfirmationDialog = () => (
    <ResponsiveDialog
      open={open}
      onOpenChange={() => settle(false)}
      title={title}
      description={description}
    >
      <div className="pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => settle(false)}>
          {t("cancel")}
        </Button>
        <Button
          variant={options.destructive ? "destructive" : "default"}
          onClick={() => settle(true)}
        >
          {options.confirmLabel ?? t("confirm")}
        </Button>
      </div>
    </ResponsiveDialog>
  );

  return [ConfirmationDialog, confirm];
};
