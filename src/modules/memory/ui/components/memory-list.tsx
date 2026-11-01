"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveIcon, ArchiveRestoreIcon, BrainIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/use-confirm";
import { Link } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";

export const MEMORY_TYPES = ["decision", "fact", "preference", "todo", "glossary"] as const;
type MemoryType = (typeof MEMORY_TYPES)[number];
type Filter = MemoryType | "all";

interface Props {
  // Limit to one agent's memories (plus shared ones); omit for all.
  agentId?: string;
}

export const MemoryList = ({ agentId }: Props) => {
  const t = useTranslations("memory");
  const format = useFormatter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<{ id: string; content: string; detail: string } | null>(null);
  const [draft, setDraft] = useState({ type: "fact" as MemoryType, content: "", detail: "" });
  const [ConfirmDialog, confirm] = useConfirm(t("deleteTitle"), t("deleteDescription"), { destructive: true });

  const listInput = {
    agentId: agentId ?? null,
    type: filter === "all" ? null : filter,
    search: search.trim() || null,
    archived: showArchived,
  };
  const list = useQuery(trpc.memory.list.queryOptions(listInput));
  const invalidate = () => queryClient.invalidateQueries(trpc.memory.list.pathFilter());

  const onError = (error: { message: string }) => toast.error(error.message);
  const create = useMutation(
    trpc.memory.create.mutationOptions({
      onSuccess: async () => {
        setDraft((value) => ({ ...value, content: "", detail: "" }));
        toast.success(t("saved"));
        await invalidate();
      },
      onError,
    }),
  );
  const update = useMutation(
    trpc.memory.update.mutationOptions({
      onSuccess: async () => {
        setEditing(null);
        toast.success(t("saved"));
        await invalidate();
      },
      onError,
    }),
  );
  const setArchived = useMutation(trpc.memory.setArchived.mutationOptions({ onSuccess: invalidate, onError }));
  const remove = useMutation(
    trpc.memory.remove.mutationOptions({
      onSuccess: async () => {
        toast.success(t("deleted"));
        await invalidate();
      },
      onError,
    }),
  );

  const onDelete = async (id: string) => {
    if (await confirm()) remove.mutate({ id });
  };

  return (
    <div className="flex flex-col gap-4">
      <ConfirmDialog />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="h-auto flex-wrap">
            {(["all", ...MEMORY_TYPES] as const).map((type) => (
              <TabsTrigger key={type} value={type}>
                {t(`types.${type}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-9 md:w-56"
          />
          <Label className="flex shrink-0 items-center gap-2 text-sm font-normal">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
            {t("showArchived")}
          </Label>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.content.trim().length < 2) return;
          create.mutate({
            agentId: agentId ?? null,
            type: draft.type,
            content: draft.content,
            detail: draft.type === "glossary" ? draft.detail || null : null,
          });
        }}
      >
        <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as MemoryType })}>
          <SelectTrigger className="sm:w-40" aria-label={t("types.all")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMORY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={draft.content}
          onChange={(event) => setDraft({ ...draft, content: event.target.value })}
          placeholder={t("addPlaceholder")}
          aria-label={t("add")}
          maxLength={400}
        />
        {draft.type === "glossary" && (
          <Input
            value={draft.detail}
            onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
            placeholder={t("definition")}
            aria-label={t("definition")}
            maxLength={400}
          />
        )}
        <Button type="submit" disabled={create.isPending || draft.content.trim().length < 2}>
          <PlusIcon />
          {t("add")}
        </Button>
      </form>

      {list.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : !list.data?.length ? (
        <EmptyState title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.data.map((memory) => (
            <li key={memory.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{t(`types.${memory.type}`)}</Badge>
                {memory.archivedAt && <Badge variant="outline">{t("archived")}</Badge>}
                {!agentId && <span>{memory.agentName ?? t("shared")}</span>}
                {memory.sourceMeetingId && memory.sourceMeetingName && (
                  <Link href={`/dashboard/meetings/${memory.sourceMeetingId}`} className="hover:underline">
                    {t("from", { name: memory.sourceMeetingName })}
                  </Link>
                )}
                <span className="ml-auto">{format.relativeTime(new Date(memory.updatedAt))}</span>
              </div>

              {editing?.id === memory.id ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    update.mutate({ id: memory.id, content: editing.content, detail: editing.detail || null });
                  }}
                >
                  <Textarea
                    value={editing.content}
                    onChange={(event) => setEditing({ ...editing, content: event.target.value })}
                    maxLength={400}
                    aria-label={t("edit")}
                  />
                  {memory.type === "glossary" && (
                    <Input
                      value={editing.detail}
                      onChange={(event) => setEditing({ ...editing, detail: event.target.value })}
                      placeholder={t("definition")}
                      aria-label={t("definition")}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={update.isPending}>
                      {t("save")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-sm leading-relaxed">
                    {memory.type === "glossary" ? <strong className="font-semibold">{memory.content}</strong> : memory.content}
                    {memory.detail && <span className="text-muted-foreground">: {memory.detail}</span>}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={t("edit")}
                      onClick={() => setEditing({ id: memory.id, content: memory.content, detail: memory.detail ?? "" })}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={memory.archivedAt ? t("restore") : t("archive")}
                      onClick={() => setArchived.mutate({ id: memory.id, archived: !memory.archivedAt })}
                    >
                      {memory.archivedAt ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={t("delete")}
                      onClick={() => onDelete(memory.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// On/off switch for one agent's learning, shown on the agent page.
export const AgentMemoryToggle = ({ agentId, enabled }: { agentId: string; enabled: boolean }) => {
  const t = useTranslations("memory");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toggle = useMutation(
    trpc.memory.setAgentMemory.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.agents.getOne.queryOptions({ id: agentId })),
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <BrainIcon className="mt-0.5 size-5 shrink-0 text-ai" aria-hidden />
      <div className="flex-1">
        <Label htmlFor={`memory-${agentId}`} className="font-medium">
          {t("toggleLabel")}
        </Label>
        <p className="text-sm text-muted-foreground">{t("toggleHint")}</p>
      </div>
      <Switch
        id={`memory-${agentId}`}
        checked={enabled}
        disabled={toggle.isPending}
        onCheckedChange={(checked) => toggle.mutate({ agentId, enabled: checked })}
      />
    </div>
  );
};
