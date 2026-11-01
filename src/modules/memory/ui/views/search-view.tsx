"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { SearchIcon, SparklesIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { Fragment, useEffect, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { formatTimestamp } from "@/lib/utils";
import { getQuotaInfo } from "@/modules/billing/lib/quota-dialog";
import { useTRPC } from "@/trpc/client";

type Source = { tag: string; meetingId: string; meetingName: string };

// Turns "[M2 12:34]" citations into links that open the meeting at that moment.
function renderAnswer(answer: string, sources: Source[]) {
  const parts: ReactNode[] = [];
  const pattern = /\[(M\d+) (\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
  let last = 0;
  for (const match of answer.matchAll(pattern)) {
    const source = sources.find((item) => item.tag === match[1]);
    if (match.index > last) parts.push(answer.slice(last, match.index));
    const seconds = match[4]
      ? Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4])
      : Number(match[2]) * 60 + Number(match[3]);
    parts.push(
      source ? (
        <Link
          key={match.index}
          href={`/dashboard/meetings/${source.meetingId}?t=${seconds}`}
          className="mx-0.5 rounded bg-primary/10 px-1 font-mono text-xs text-primary hover:underline"
          title={source.meetingName}
        >
          {match[0].slice(1, -1)}
        </Link>
      ) : (
        match[0]
      ),
    );
    last = match.index + match[0].length;
  }
  parts.push(answer.slice(last));
  return parts;
}

export const SearchView = () => {
  const t = useTranslations("search");
  const tMemory = useTranslations("memory");
  const format = useFormatter();
  const locale = useLocale();
  const trpc = useTRPC();
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [draft, setDraft] = useState(q);

  const results = useQuery({ ...trpc.search.query.queryOptions({ q }), enabled: q.trim().length >= 2 });
  const ask = useMutation(trpc.search.ask.mutationOptions());
  const ensureIndexed = useMutation(trpc.search.ensureIndexed.mutationOptions());
  const { mutate: queueIndexing } = ensureIndexed;
  useEffect(() => queueIndexing(), [queueIndexing]);

  const submit = (mode: "search" | "ask") => {
    const value = draft.trim();
    if (value.length < 2) return;
    void setQ(value);
    if (mode === "ask") ask.mutate({ question: value, language: locale === "en" ? "en" : "vi" });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
      <PageHeader title={t("title")} description={t("description")} />

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          submit("search");
        }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("title")}
            className="h-10 pl-9"
            maxLength={300}
            autoFocus
          />
        </div>
        <Button type="submit" variant="outline" className="h-10">
          {t("search")}
        </Button>
        <Button type="button" className="h-10" disabled={ask.isPending} onClick={() => submit("ask")}>
          <SparklesIcon />
          {t("ask")}
        </Button>
      </form>

      {(ask.isPending || ask.data || ask.error) && (
        <section className="rounded-xl border border-ai/30 bg-ai/5 p-5" aria-live="polite">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <SparklesIcon className="size-4 text-ai" aria-hidden />
            {t("answer")}
          </h2>
          {ask.isPending ? (
            <p className="text-sm text-muted-foreground">{t("asking")}</p>
          ) : ask.error ? (
            !getQuotaInfo(ask.error) && <p className="text-sm text-destructive">{ask.error.message}</p>
          ) : ask.data?.answer ? (
            <>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {renderAnswer(ask.data.answer, ask.data.sources)}
              </p>
              {ask.data.sources.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {t("sources")}:
                  {ask.data.sources.map((source) => (
                    <Fragment key={source.tag}>
                      <Link href={`/dashboard/meetings/${source.meetingId}`} className="hover:underline">
                        {source.tag} · {source.meetingName}
                      </Link>
                    </Fragment>
                  ))}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noAnswer")}</p>
          )}
        </section>
      )}

      {q.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      ) : results.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : results.error ? (
        <p className="text-sm text-destructive">{results.error.message}</p>
      ) : !results.data.moments.length && !results.data.memories.length ? (
        <EmptyState title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{t("moments")}</h2>
            {results.data.moments.map((moment) => (
              <Link
                key={`${moment.meetingId}-${moment.startMs}`}
                href={`/dashboard/meetings/${moment.meetingId}?t=${Math.floor(moment.startMs / 1000)}`}
                className="flex flex-col gap-1 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{moment.meetingName}</span>
                  {moment.startedAt && <span>{format.dateTime(new Date(moment.startedAt), { dateStyle: "medium" })}</span>}
                  <Badge variant="secondary" className="font-mono">
                    {t("openAt", { time: formatTimestamp(moment.startMs) })}
                  </Badge>
                </span>
                <span className="line-clamp-3 whitespace-pre-line text-sm">{moment.content}</span>
              </Link>
            ))}
          </section>
          {results.data.memories.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">{t("memories")}</h2>
              {results.data.memories.map((memory) => (
                <div key={memory.id} className="rounded-lg border bg-card p-3 text-sm">
                  <Badge variant="secondary" className="mb-1">
                    {tMemory(`types.${memory.type}`)}
                  </Badge>
                  <p>
                    {memory.content}
                    {memory.detail && <span className="text-muted-foreground">: {memory.detail}</span>}
                  </p>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
