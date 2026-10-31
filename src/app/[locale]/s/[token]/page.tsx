import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { NotesDocument } from "@/modules/meetings/ui/components/notes-document";
import { caller } from "@/trpc/server";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sharePage");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const SharePage = async ({ params }: Props) => {
  const { token } = await params;
  const t = await getTranslations("sharePage");
  const format = await getFormatter();
  const meeting = await caller.share.getMeeting({ token }).catch(() => null);

  return (
    <div className="min-h-svh bg-muted">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="" aria-hidden width={26} height={26} />
          <span className="font-semibold">Meet.AI</span>
        </Link>
        <Button asChild size="sm">
          <Link href="/sign-up">{t("cta")}</Link>
        </Button>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        {meeting ? (
          <>
            <p className="text-sm font-medium text-primary">{t("sharedNotes")}</p>
            <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-10">
              <NotesDocument
                name={meeting.name}
                dateLabel={
                  meeting.startedAt
                    ? format.dateTime(new Date(meeting.startedAt), { dateStyle: "long" })
                    : null
                }
                agentName={meeting.agentName}
                insights={meeting.insights}
                summary={meeting.summary}
                transcript={meeting.transcript}
              />
            </div>
          </>
        ) : (
          <p className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
            {t("notFound")}
          </p>
        )}

        <section className="flex flex-col items-center gap-3 rounded-2xl bg-ai-gradient p-8 text-center text-ai-foreground">
          <SparklesIcon className="size-6" />
          <h2 className="text-xl font-semibold">{t("ctaTitle")}</h2>
          <p className="max-w-md text-sm opacity-90">{t("ctaDescription")}</p>
          <Button asChild variant="secondary">
            <Link href="/sign-up">{t("cta")}</Link>
          </Button>
        </section>
      </main>
    </div>
  );
};

export default SharePage;
