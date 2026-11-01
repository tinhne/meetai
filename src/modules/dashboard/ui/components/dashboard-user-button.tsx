"use client";

import {
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

const triggerClassName =
  "rounded-xl border border-sidebar-border gap-x-2 p-2.5 w-full flex items-center justify-between bg-sidebar-accent/40 hover:bg-sidebar-accent transition-colors overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

export const DashboardUserButton = () => {
  const t = useTranslations("userMenu");
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data, isPending } = authClient.useSession();

  const onLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  if (isPending || !data?.user) {
    return null;
  }

  const name = data.user.name || t("unnamed");
  const email = data.user.email;

  const identity = (
    <>
      {data.user.image ? (
        <Avatar className="size-9">
          <AvatarImage src={data.user.image} alt="" />
        </Avatar>
      ) : (
        <GeneratedAvatar seed={name} variant="initials" className="size-9" />
      )}
      <div className="flex flex-col gap-0.5 text-left overflow-hidden flex-1 min-w-0">
        <p className="text-sm font-medium truncate w-full">{name}</p>
        <p className="text-xs text-sidebar-foreground/70 truncate w-full">
          {email}
        </p>
      </div>
      <ChevronsUpDownIcon className="size-4 shrink-0 opacity-70" />
    </>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger className={triggerClassName}>{identity}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{name}</DrawerTitle>
            <DrawerDescription>{email}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">
                <SettingsIcon />
                {t("settings")}
              </Link>
            </Button>
            <Button
              onClick={() => authClient.customer.portal()}
              variant="outline"
            >
              <CreditCardIcon />
              {t("billing")}
            </Button>
            <Button onClick={onLogout} variant="outline">
              <LogOutIcon />
              {t("logout")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClassName}>
        {identity}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium truncate">{name}</span>
            <span className="text-sm font-normal text-muted-foreground truncate">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <SettingsIcon />
            {t("settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => authClient.customer.portal()}>
          <CreditCardIcon />
          {t("billing")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout}>
          <LogOutIcon />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
