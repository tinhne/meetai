import { useState, useRef, useEffect, JSX } from "react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";

type ConfirmFn = () => Promise<boolean>;

export const useConfirm = (
  title: string,
  description: string,
): [() => JSX.Element, ConfirmFn] => {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = () => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpen(true);
    });
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirm = () => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    handleClose();
  };

  const handleCancel = () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    handleClose();
  };

  // cleanup tránh memory leak
  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const ConfirmationDialog = () => (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleClose}
      title={title}
      description={description}
    >
      <div className="pt-4 flex gap-2 justify-center">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>

        <Button onClick={handleConfirm}>Confirm</Button>
      </div>
    </ResponsiveDialog>
  );

  return [ConfirmationDialog, confirm];
};
