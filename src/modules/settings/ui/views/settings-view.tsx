"use client";

import { LaptopIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { useSwitchLocale } from "@/components/locale-switcher";
import { PageHeader } from "@/components/page-header";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  DataSection,
  ProfileSection,
  SessionsSection,
  SettingsSection,
} from "../components/account-sections";

const subscribe = () => () => {};
// The theme is only known on the client; avoid hydration mismatches.
const useIsClient = () =>
  useSyncExternalStore(subscribe, () => true, () => false);


const OptionCard = ({
  value,
  label,
  icon: Icon,
  checked,
}: {
  value: string;
  label: string;
  icon?: LucideIcon;
  checked: boolean;
}) => (
  <Label
    htmlFor={`option-${value}`}
    className={cn(
      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent",
      checked && "border-primary bg-primary/5",
    )}
  >
    <RadioGroupItem id={`option-${value}`} value={value} />
    {Icon && <Icon className="size-4 text-muted-foreground" />}
    <span className="text-sm font-medium">{label}</span>
  </Label>
);

export const SettingsView = () => {
  const t = useTranslations("settings");
  const tTheme = useTranslations("theme");
  const tLanguage = useTranslations("language");
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const { switchLocale, isPending } = useSwitchLocale();
  const isClient = useIsClient();

  const themeOptions: { value: string; icon: LucideIcon }[] = [
    { value: "light", icon: SunIcon },
    { value: "dark", icon: MoonIcon },
    { value: "system", icon: LaptopIcon },
  ];
  const currentTheme = isClient ? (theme ?? "system") : undefined;

  return (
    <div className="flex-1 py-6 px-4 md:px-8 flex flex-col gap-6 max-w-4xl w-full mx-auto">
      <PageHeader title={t("title")} description={t("description")} />

      <ProfileSection />

      <SettingsSection
        title={t("appearanceTitle")}
        description={t("appearanceDescription")}
      >
        <RadioGroup
          value={currentTheme}
          onValueChange={setTheme}
          aria-label={tTheme("label")}
          className="grid gap-2 sm:grid-cols-3"
        >
          {themeOptions.map((option) => (
            <OptionCard
              key={option.value}
              value={option.value}
              icon={option.icon}
              label={tTheme(option.value as "light" | "dark" | "system")}
              checked={currentTheme === option.value}
            />
          ))}
        </RadioGroup>
      </SettingsSection>

      <SettingsSection
        title={t("languageTitle")}
        description={t("languageDescription")}
      >
        <RadioGroup
          value={locale}
          onValueChange={(value) => switchLocale(value as AppLocale)}
          aria-label={tLanguage("label")}
          disabled={isPending}
          className="grid gap-2 sm:grid-cols-2"
        >
          {routing.locales.map((option) => (
            <OptionCard
              key={option}
              value={option}
              label={tLanguage(option)}
              checked={locale === option}
            />
          ))}
        </RadioGroup>
      </SettingsSection>

      <SessionsSection />
      <DataSection />
    </div>
  );
};
