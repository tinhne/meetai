"use client";

import {
  BotIcon,
  BrainIcon,
  HomeIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { DashboardUserButton } from "./dashboard-user-button";
import { DashboardTrial } from "./dashboard-trial";

type NavKey = "home" | "meetings" | "agents" | "searchPage" | "memory" | "billing" | "settings";

interface NavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const mainItems: NavItem[] = [
  { key: "home", href: "/dashboard", icon: HomeIcon, exact: true },
  { key: "meetings", href: "/dashboard/meetings", icon: VideoIcon },
  { key: "agents", href: "/dashboard/agents", icon: BotIcon },
  { key: "searchPage", href: "/dashboard/search", icon: SearchIcon },
  { key: "memory", href: "/dashboard/memory", icon: BrainIcon },
];

const accountItems: NavItem[] = [
  { key: "billing", href: "/dashboard/billing", icon: SparklesIcon },
  { key: "settings", href: "/dashboard/settings", icon: SettingsIcon },
];

const NavGroup = ({ label, items }: { label: string; items: NavItem[] }) => {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/60">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className="h-10 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                >
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => isMobile && setOpenMobile(false)}
                  >
                    <item.icon className="size-5" />
                    <span className="text-sm font-medium">{t(item.key)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export const DashboardSidebar = () => {
  const t = useTranslations("nav");

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 px-2 pt-2">
          <Image src="/logo.svg" alt="" aria-hidden width={28} height={28} />
          <span className="text-xl font-semibold tracking-tight text-sidebar-accent-foreground">
            Meet.AI
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label={t("workspace")} items={mainItems} />
        <NavGroup label={t("account")} items={accountItems} />
      </SidebarContent>
      <SidebarFooter className="gap-3">
        <DashboardTrial />
        <DashboardUserButton />
      </SidebarFooter>
    </Sidebar>
  );
};
