"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  BotIcon,
  CalendarIcon,
  LoaderIcon,
  LockIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { CallConnect } from "@/modules/call/ui/component/call-connect";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

interface Props {
  code: string;
}

const Card = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-svh items-center justify-center bg-radial from-sidebar-accent to-stage p-4">
    <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-card p-6 text-card-foreground shadow-lg md:p-8">
      {children}
    </div>
  </div>
);

const Message = ({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) => (
  <Card>
    <div className="flex flex-col items-center gap-3 text-center">
      {icon}
      <h1 className="text-xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">Meet.AI</Link>
      </Button>
    </div>
  </Card>
);

export const JoinView = ({ code }: Props) => {
  const t = useTranslations("join");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const info = useQuery({ ...trpc.join.getInfo.queryOptions({ code }), retry: false });
  const viewerStatus = info.data?.viewer.status ?? null;

  // While waiting, poll until the host decides.
  const status = useQuery({
    ...trpc.join.status.queryOptions({ code }),
    enabled: viewerStatus === "waiting",
    refetchInterval: 3000,
  });
  const currentStatus = status.data?.status ?? viewerStatus;

  if (info.isPending) {
    return (
      <div role="status" className="flex min-h-svh items-center justify-center">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    );
  }

  if (info.error || !info.data) {
    return (
      <Message
        icon={<XCircleIcon className="size-10 text-muted-foreground" />}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
      />
    );
  }

  const meeting = info.data;

  if (!meeting.joinable || status.data?.meetingStatus === "processing") {
    return (
      <Message
        icon={<CalendarIcon className="size-10 text-muted-foreground" />}
        title={t("endedTitle")}
        description={t("endedDescription")}
      />
    );
  }

  if (currentStatus === "admitted") return <JoinedCall code={code} meeting={meeting} />;

  if (currentStatus === "waiting") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 text-center" role="status" aria-live="polite">
          <LoaderIcon className="size-8 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">{t("waitingTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("waitingDescription")}</p>
          <p className="text-sm font-medium">{meeting.meetingName}</p>
        </div>
      </Card>
    );
  }

  if (currentStatus === "denied" || currentStatus === "removed") {
    return (
      <Message
        icon={<XCircleIcon className="size-10 text-destructive" />}
        title={currentStatus === "denied" ? t("deniedTitle") : t("removedTitle")}
      />
    );
  }

  if (meeting.locked && meeting.viewer.kind !== "owner") {
    return (
      <Message
        icon={<LockIcon className="size-10 text-muted-foreground" />}
        title={t("lockedTitle")}
        description={t("lockedDescription")}
      />
    );
  }

  return (
    <RequestForm
      code={code}
      meeting={meeting}
      onRequested={() =>
        void queryClient.invalidateQueries(trpc.join.getInfo.queryOptions({ code }))
      }
    />
  );
};

type MeetingInfo = inferRouterOutputs<AppRouter>["join"]["getInfo"];

const MeetingSummary = ({ meeting }: { meeting: MeetingInfo }) => {
  const t = useTranslations("join");
  const format = useFormatter();

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Image src="/logo.svg" alt="" aria-hidden width={36} height={36} />
      <h1 className="text-2xl font-semibold tracking-tight">{meeting.meetingName}</h1>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {meeting.hostName && (
          <span className="flex items-center justify-center gap-1.5">
            <UserIcon className="size-4" aria-hidden />
            {t("hostedBy", { name: meeting.hostName })}
          </span>
        )}
        {meeting.agentName && (
          <span className="flex items-center justify-center gap-1.5 text-ai">
            <BotIcon className="size-4" aria-hidden />
            {t("withAi", { name: meeting.agentName })}
          </span>
        )}
        {meeting.scheduledAt && (
          <span className="flex items-center justify-center gap-1.5">
            <CalendarIcon className="size-4" aria-hidden />
            {format.dateTime(new Date(meeting.scheduledAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        )}
      </div>
    </div>
  );
};

const RequestForm = ({
  code,
  meeting,
  onRequested,
}: {
  code: string;
  meeting: MeetingInfo;
  onRequested: () => void;
}) => {
  const t = useTranslations("join");
  const tCall = useTranslations("call");
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const isAnonymous = meeting.viewer.kind === "anonymous";
  const isOwner = meeting.viewer.kind === "owner";

  const request = useMutation(
    trpc.join.request.mutationOptions({
      onSuccess: onRequested,
      onError: (error) => toast.error(error.message),
    }),
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    request.mutate({
      code,
      consent: true,
      guestName: isAnonymous ? name : undefined,
    });
  };

  return (
    <Card>
      <MeetingSummary meeting={meeting} />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {isAnonymous ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="guest-name">{t("yourName")}</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("yourNamePlaceholder")}
              autoComplete="name"
              maxLength={60}
              required
            />
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/j/${code}`)}`}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("signInInstead")}
            </Link>
          </div>
        ) : (
          <p className="text-center text-sm">
            {t("joiningAs", { name: meeting.viewer.name ?? "" })}
          </p>
        )}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
          <Checkbox
            id="join-consent"
            checked={consent}
            onCheckedChange={(value) => setConsent(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="join-consent" className="text-sm font-normal leading-snug">
            {tCall("consent")}
          </Label>
        </div>
        <Button
          type="submit"
          disabled={!consent || request.isPending || (isAnonymous && name.trim().length < 2)}
        >
          {isOwner ? t("joinNow") : t("askToJoin")}
        </Button>
      </form>
    </Card>
  );
};

const JoinedCall = ({ code, meeting }: { code: string; meeting: MeetingInfo }) => {
  const trpc = useTRPC();
  const { mutateAsync: getToken } = useMutation(trpc.join.token.mutationOptions());
  const { mutateAsync: askAgent } = useMutation(trpc.join.askAgent.mutationOptions());
  const [session, setSession] = useState<Awaited<ReturnType<typeof getToken>> | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToken({ code })
      .then((result) => !cancelled && setSession(result))
      .catch((error: Error) => !cancelled && setFailed(error.message));
    return () => {
      cancelled = true;
    };
  }, [code, getToken]);

  if (failed) {
    return (
      <Message icon={<XCircleIcon className="size-10 text-destructive" />} title={failed} />
    );
  }

  if (!session) {
    return (
      <div role="status" className="flex min-h-svh items-center justify-center">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <CallConnect
      callType={session.callType}
      user={session.user}
      tokenProvider={async () => (await getToken({ code })).token}
      info={{
        meetingId: session.meetingId,
        meetingName: meeting.meetingName,
        language: session.language,
        aiMode: session.aiMode,
        joinMode: session.joinMode,
        agentId: session.agentId,
        isHost: session.isHost,
        canRate: meeting.viewer.kind !== "anonymous" && meeting.viewer.kind !== "guest",
        askAgent: () => askAgent({ code }),
        backHref: meeting.viewer.kind === "owner" ? `/dashboard/meetings/${session.meetingId}` : null,
      }}
    />
  );
};
