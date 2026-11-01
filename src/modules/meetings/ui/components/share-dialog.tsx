"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, Link2Icon, Link2OffIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPathname } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";

interface Props {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDialog = ({ meetingId, open, onOpenChange }: Props) => {
  const t = useTranslations("notes.share");
  const locale = useLocale();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const linkQuery = trpc.meetings.getShareLink.queryOptions({ id: meetingId });
  const { data: link, isPending } = useQuery({ ...linkQuery, enabled: open });

  const refresh = () => queryClient.invalidateQueries(linkQuery);
  const create = useMutation(
    trpc.meetings.createShareLink.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    }),
  );
  const revoke = useMutation(
    trpc.meetings.revokeShareLinks.mutationOptions({
      onSuccess: () => {
        toast.success(t("revoked"));
        void refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const url = link
    ? `${typeof window === "undefined" ? "" : window.location.origin}${getPathname({ href: `/s/${link.token}`, locale })}`
    : "";

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
    >
      <div className="flex flex-col gap-4 pt-2">
        {link ? (
          <>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label={t("title")} className="font-mono text-sm" />
              <Button
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast.success(t("copied"));
                }}
              >
                <CopyIcon />
                {t("copy")}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="self-start text-destructive"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate({ id: meetingId })}
            >
              <Link2OffIcon />
              {t("revoke")}
            </Button>
          </>
        ) : (
          <Button
            disabled={isPending || create.isPending}
            onClick={() => create.mutate({ id: meetingId })}
          >
            <Link2Icon />
            {t("create")}
          </Button>
        )}
      </div>
    </ResponsiveDialog>
  );
};
