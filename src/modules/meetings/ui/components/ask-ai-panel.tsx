"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SendIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { parseTimestamp } from "../../lib/analytics";
import { TimestampButton } from "./timestamp-button";

// "[12:34]" citations become links handled by TimestampButton.
const linkCitations = (content: string) =>
  content.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, "[$1](#t=$1)");

interface Props {
  meetingId: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const AskAiPanel = ({ meetingId }: Props) => {
  const t = useTranslations("askAi");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const historyQuery = trpc.meetings.getAskAiMessages.queryOptions({ id: meetingId });
  const { data: history } = useQuery(historyQuery);

  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: ChatMessage[] = [
    ...(history ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
    ...pending,
  ];
  const isBusy = streaming !== null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, streaming]);

  const ask = async (question: string) => {
    const message = question.trim();
    if (!message || isBusy) return;

    setInput("");
    setPending([{ id: `local-${Date.now()}`, role: "user", content: message }]);
    setStreaming("");

    try {
      const response = await fetch(`/api/meetings/${meetingId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as {
          retryAfterSec?: number;
        };
        toast.error(
          response.status === 429 && body.retryAfterSec
            ? t("rateLimited", { minutes: Math.ceil(body.retryAfterSec / 60) })
            : t("error"),
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setStreaming(answer);
      }
    } catch {
      toast.error(t("error"));
    } finally {
      await queryClient.invalidateQueries(historyQuery);
      setPending([]);
      setStreaming(null);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  const suggestions = [t("suggestion1"), t("suggestion2"), t("suggestion3")];

  return (
    <div className="bg-card rounded-xl border flex flex-col h-[60svh] min-h-[420px]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
        aria-live="polite"
      >
        {messages.length === 0 && streaming === null ? (
          <div className="m-auto flex max-w-md flex-col items-center gap-4 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-ai/10">
              <SparklesIcon className="size-5 text-ai" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">{t("emptyTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => void ask(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} role={message.role} content={message.content} />
            ))}
            {streaming !== null && (
              <MessageBubble
                role="assistant"
                content={streaming || t("thinking")}
                muted={!streaming}
              />
            )}
          </>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(input);
            }
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          maxLength={2000}
          rows={1}
          className="min-h-10 max-h-40 resize-none"
        />
        <Button type="submit" size="icon" disabled={isBusy || !input.trim()} aria-label={t("send")}>
          <SendIcon />
        </Button>
      </form>
    </div>
  );
};

const MessageBubble = ({
  role,
  content,
  muted,
}: {
  role: "user" | "assistant";
  content: string;
  muted?: boolean;
}) => (
  <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        role === "user"
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-muted rounded-bl-md",
        muted && "text-muted-foreground animate-pulse",
      )}
    >
      {role === "assistant" ? (
        <Markdown
          components={{
            a: ({ href, children }) => {
              const ms = href?.startsWith("#t=") ? parseTimestamp(href.slice(3)) : null;
              return ms !== null ? (
                <TimestampButton ms={ms} />
              ) : (
                <a href={href} className="underline" target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            },
            p: (props) => <p className="mb-2 last:mb-0" {...props} />,
            ul: (props) => <ul className="mb-2 list-disc pl-5" {...props} />,
            ol: (props) => <ol className="mb-2 list-decimal pl-5" {...props} />,
            strong: (props) => <strong className="font-semibold" {...props} />,
          }}
        >
          {linkCitations(content)}
        </Markdown>
      ) : (
        <p className="whitespace-pre-wrap">{content}</p>
      )}
    </div>
  </div>
);
