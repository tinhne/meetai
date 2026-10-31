import { useQuery } from "@tanstack/react-query";
import {
  BotIcon,
  HomeIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  SunMoonIcon,
  VideoIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useState } from "react";

import { GeneratedAvatar } from "@/components/generated-avatar";
import {
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandResponsiveDialog,
} from "@/components/ui/command";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export const DashboardCommand = ({ open, setOpen }: Props) => {
  const t = useTranslations("commandPalette");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState("");
  const trpc = useTRPC();

  const meetings = useQuery({
    ...trpc.meetings.getMany.queryOptions({ search, pageSize: 20 }),
    enabled: open,
  });

  const agents = useQuery({
    ...trpc.agents.getMany.queryOptions({ search, pageSize: 20 }),
    enabled: open,
  });

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const matches = (label: string) =>
    label.toLowerCase().includes(search.trim().toLowerCase());

  const actions = [
    {
      label: t("newMeeting"),
      icon: PlusIcon,
      onSelect: () => router.push("/dashboard/meetings?new=1"),
    },
    {
      label: t("newAgent"),
      icon: PlusIcon,
      onSelect: () => router.push("/dashboard/agents?new=1"),
    },
    {
      label: t("toggleTheme"),
      icon: SunMoonIcon,
      onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
  ].filter((action) => matches(action.label));

  const pages = [
    { label: tNav("home"), icon: HomeIcon, href: "/dashboard" },
    { label: tNav("meetings"), icon: VideoIcon, href: "/dashboard/meetings" },
    { label: tNav("agents"), icon: BotIcon, href: "/dashboard/agents" },
    { label: tNav("billing"), icon: SparklesIcon, href: "/dashboard/billing" },
    { label: tNav("settings"), icon: SettingsIcon, href: "/dashboard/settings" },
  ].filter((page) => matches(page.label));

  return (
    <CommandResponsiveDialog
      shouldFilter={false}
      open={open}
      onOpenChange={setOpen}
    >
      <CommandInput
        value={search}
        onValueChange={(value) => setSearch(value)}
        placeholder={t("placeholder")}
      />
      <CommandList>
        {actions.length > 0 && (
          <CommandGroup heading={t("actions")}>
            {actions.map((action) => (
              <CommandItem
                key={action.label}
                onSelect={() => run(action.onSelect)}
              >
                <action.icon />
                {action.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {pages.length > 0 && (
          <CommandGroup heading={t("navigation")}>
            {pages.map((page) => (
              <CommandItem
                key={page.href}
                onSelect={() => run(() => router.push(page.href))}
              >
                <page.icon />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading={t("meetings")}>
          {meetings.data?.items.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              {t("noMeetings")}
            </p>
          )}
          {meetings.data?.items.map((meeting) => (
            <CommandItem
              key={meeting.id}
              onSelect={() =>
                run(() => router.push(`/dashboard/meetings/${meeting.id}`))
              }
            >
              <VideoIcon />
              {meeting.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={t("agents")}>
          {agents.data?.items.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              {t("noAgents")}
            </p>
          )}
          {agents.data?.items.map((agent) => (
            <CommandItem
              key={agent.id}
              onSelect={() =>
                run(() => router.push(`/dashboard/agents/${agent.id}`))
              }
            >
              <GeneratedAvatar
                seed={agent.name}
                variant="botttsNeutral"
                className="size-5"
              />
              {agent.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandResponsiveDialog>
  );
};
