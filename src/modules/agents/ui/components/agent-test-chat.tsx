"use client";

import { MessageSquareTextIcon, RotateCcwIcon, SendIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Text-only preview of the agent's personality (Gemini, no voice minutes).
export const AgentTestChat = ({ agentId }: { agentId: string }) => {
  const t = useTranslations("agents.testChat");
  const locale = useLocale() === "en" ? "en" : "vi";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, streaming]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || streaming !== null) return;

    const history: Message[] = [...messages, { role: "user" as const, content }].slice(-20);
    setMessages(history);
    setInput("");
    setStreaming("");

    try {
      const response = await fetch(`/api/agents/${agentId}/test-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: locale, messages: history }),
      });
      if (!response.ok || !response.body) {
        toast.error(response.status === 429 ? t("rateLimited") : t("error"));
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
      if (answer.trim()) setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch {
      toast.error(t("error"));
    } finally {
      setStreaming(null);
    }
  };

  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="flex items-start gap-3">
          <MessageSquareTextIcon className="mt-0.5 size-5 text-ai" aria-hidden />
          <div>
            <h2 className="font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={streaming !== null}>
            <RotateCcwIcon />
            {t("reset")}
          </Button>
        )}
      </div>
      <div ref={listRef} className="flex h-72 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {[...messages, ...(streaming !== null ? [{ role: "assistant" as const, content: streaming || "…" }] : [])].map(
          (message, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
                message.role === "user"
                  ? "self-end rounded-br-md bg-primary text-primary-foreground"
                  : "self-start rounded-bl-md bg-muted",
              )}
            >
              {message.content}
            </div>
          ),
        )}
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          rows={1}
          maxLength={2000}
          className="min-h-10 max-h-32 resize-none"
        />
        <Button type="submit" size="icon" aria-label={t("send")} disabled={!input.trim() || streaming !== null}>
          <SendIcon />
        </Button>
      </form>
    </section>
  );
};
