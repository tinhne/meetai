"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, LaptopIcon, LogOutIcon, TrashIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export const SettingsSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm md:grid-cols-[240px_1fr] md:gap-8">
    <div className="flex flex-col gap-1">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </section>
);

export const ProfileSection = () => {
  const t = useTranslations("settingsExtra");
  const { data: session } = authClient.useSession();
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const value = name ?? session?.user.name ?? "";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    const { error } = await authClient.updateUser({ name: value.trim() });
    setSaving(false);
    if (error) toast.error(error.message ?? "");
    else toast.success(t("saved"));
  };

  return (
    <SettingsSection title={t("profileTitle")} description={t("profileDescription")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">{t("name")}</Label>
            <Input
              id="profile-name"
              value={value}
              maxLength={100}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-email">{t("email")}</Label>
            <Input id="profile-email" value={session?.user.email ?? ""} readOnly disabled />
          </div>
        </div>
        <Button type="submit" className="self-start" disabled={saving || !value.trim()}>
          {t("save")}
        </Button>
      </form>
    </SettingsSection>
  );
};

const describeDevice = (userAgent: string | null | undefined, unknown: string) => {
  if (!userAgent) return unknown;
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : unknown;
  const os = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" · ");
};

export const SessionsSection = () => {
  const t = useTranslations("settingsExtra");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const { data: current } = authClient.useSession();
  const sessionsKey = ["auth", "sessions"];
  const { data: sessions } = useQuery({
    queryKey: sessionsKey,
    queryFn: async () => (await authClient.listSessions()).data ?? [],
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: sessionsKey });

  const revoke = async (token: string) => {
    const { error } = await authClient.revokeSession({ token });
    if (error) toast.error(error.message ?? "");
    else toast.success(t("revoked"));
    void refresh();
  };

  const revokeOthers = async () => {
    const { error } = await authClient.revokeOtherSessions();
    if (error) toast.error(error.message ?? "");
    else toast.success(t("revoked"));
    void refresh();
  };

  return (
    <SettingsSection title={t("sessionsTitle")} description={t("sessionsDescription")}>
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y rounded-lg border">
          {(sessions ?? []).map((session) => {
            const isCurrent = session.token === current?.session.token;
            return (
              <li key={session.id} className="flex items-center gap-3 p-3">
                <LaptopIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {describeDevice(session.userAgent, t("unknownDevice"))}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-primary">
                        {t("currentSession")}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(session.updatedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                {!isCurrent && (
                  <Button variant="ghost" size="sm" onClick={() => void revoke(session.token)}>
                    <LogOutIcon />
                    {t("revoke")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {(sessions?.length ?? 0) > 1 && (
          <Button variant="outline" className="self-start" onClick={() => void revokeOthers()}>
            {t("revokeOthers")}
          </Button>
        )}
      </div>
    </SettingsSection>
  );
};

export const DataSection = () => {
  const t = useTranslations("settingsExtra");
  const trpc = useTRPC();
  const router = useRouter();
  const [DeleteConfirmation, confirmDelete] = useConfirm(
    t("deleteConfirmTitle"),
    t("deleteConfirmDescription"),
    { destructive: true, confirmLabel: t("deleteAccount") },
  );

  const exportData = useMutation(
    trpc.settings.exportData.mutationOptions({
      onSuccess: (data) => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `meetai-export-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success(t("exported"));
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteAccount = async () => {
    if (!(await confirmDelete())) return;
    const { error } = await authClient.deleteUser({ callbackURL: "/" });
    if (error) {
      toast.error(error.message ?? "");
      return;
    }
    toast.success(t("deleted"));
    router.push("/");
  };

  return (
    <SettingsSection title={t("dataTitle")} description={t("dataDescription")}>
      <DeleteConfirmation />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
          <DownloadIcon />
          {t("export")}
        </Button>
        <Button variant="destructive" onClick={() => void deleteAccount()}>
          <TrashIcon />
          {t("deleteAccount")}
        </Button>
      </div>
    </SettingsSection>
  );
};
