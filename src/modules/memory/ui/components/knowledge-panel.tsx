"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, GlobeIcon, LockIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { getQuotaInfo, quotaDialogStore } from "@/modules/billing/lib/quota-dialog";
import { useTRPC } from "@/trpc/client";

const STATUS_VARIANT = { processing: "secondary", ready: "default", failed: "destructive" } as const;

export const KnowledgePanel = ({ agentId }: { agentId: string }) => {
  const t = useTranslations("knowledge");
  const format = useFormatter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState({ title: "", body: "" });
  const [uploading, setUploading] = useState(false);

  const overview = useQuery(trpc.billing.getOverview.queryOptions());
  const documents = useQuery({
    ...trpc.knowledge.list.queryOptions({ agentId }),
    // Poll while documents are being processed.
    refetchInterval: (query) => (query.state.data?.some((doc) => doc.status === "processing") ? 4_000 : false),
  });
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.knowledge.list.queryOptions({ agentId })),
      queryClient.invalidateQueries(trpc.billing.getOverview.queryOptions()),
    ]);
  const onAdded = async () => {
    toast.success(t("added"));
    await invalidate();
  };
  const onError = (error: unknown) => {
    if (!getQuotaInfo(error)) toast.error(error instanceof Error ? error.message : String(error));
  };

  const addUrl = useMutation(
    trpc.knowledge.addUrl.mutationOptions({
      onSuccess: async () => {
        setUrl("");
        await onAdded();
      },
      onError,
    }),
  );
  const addText = useMutation(
    trpc.knowledge.addText.mutationOptions({
      onSuccess: async () => {
        setText({ title: "", body: "" });
        await onAdded();
      },
      onError,
    }),
  );
  const remove = useMutation(
    trpc.knowledge.remove.mutationOptions({
      onSuccess: async () => {
        toast.success(t("removed"));
        await invalidate();
      },
      onError,
    }),
  );

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("agentId", agentId);
      body.set("file", file);
      const response = await fetch("/api/knowledge/upload", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as { error?: string; quota?: unknown };
      if (response.status === 403 && data.quota) {
        const quota = getQuotaInfo({ data: { quota: data.quota } });
        if (quota) quotaDialogStore.open(quota);
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      await onAdded();
    } catch (error) {
      onError(error);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const limit = overview.data?.plan.knowledgeDocuments ?? 0;
  if (overview.data && limit === 0) {
    return (
      <EmptyState
        title={t("locked")}
        description={t("lockedDescription", { count: overview.data.pro.knowledgeDocuments })}
        action={
          <Button asChild>
            <Link href="/dashboard/billing">
              <LockIcon />
              {t("upgrade")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
            className="sr-only"
            id={`knowledge-file-${agentId}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
            <UploadIcon />
            {t("upload")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("uploadHint")}</p>
        </div>

        <form
          className="flex flex-col gap-2 rounded-lg border bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (url.trim()) addUrl.mutate({ agentId, url: url.trim() });
          }}
        >
          <Input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t("urlPlaceholder")}
            aria-label={t("addUrl")}
          />
          <Button type="submit" variant="outline" disabled={addUrl.isPending || !url.trim()}>
            <GlobeIcon />
            {t("addUrl")}
          </Button>
        </form>

        <form
          className="flex flex-col gap-2 rounded-lg border bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            addText.mutate({ agentId, title: text.title, text: text.body });
          }}
        >
          <Input
            value={text.title}
            onChange={(event) => setText({ ...text, title: event.target.value })}
            placeholder={t("textTitle")}
            aria-label={t("textTitle")}
            maxLength={120}
          />
          <Textarea
            value={text.body}
            onChange={(event) => setText({ ...text, body: event.target.value })}
            placeholder={t("textBody")}
            aria-label={t("textBody")}
            rows={2}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={addText.isPending || !text.title.trim() || text.body.trim().length < 20}
          >
            <FileTextIcon />
            {t("addText")}
          </Button>
        </form>
      </div>

      {overview.data && (
        <p className="text-xs text-muted-foreground">
          {t("usage", { used: documents.data?.length ?? 0, limit })}
        </p>
      )}

      {documents.isPending ? (
        <Skeleton className="h-20" />
      ) : !documents.data?.length ? (
        <EmptyState title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.data.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              {doc.sourceType === "url" ? (
                <GlobeIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {doc.status === "failed" && doc.error
                    ? doc.error
                    : [
                        doc.sourceUrl,
                        doc.chunkCount > 0 ? t("chunks", { count: doc.chunkCount }) : null,
                        format.relativeTime(new Date(doc.createdAt)),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[doc.status]}>{t(`status.${doc.status}`)}</Badge>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                aria-label={t("remove")}
                onClick={() => remove.mutate({ id: doc.id })}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
