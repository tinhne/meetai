"use client";

import { useTranslations } from "next-intl";
import { FaFacebook, FaGithub, FaGoogle } from "react-icons/fa";

import { Button } from "@/components/ui/button";

export type SocialProvider = "google" | "github" | "facebook";

const providers: { id: SocialProvider; label: string; icon: typeof FaGoogle }[] =
  [
    { id: "google", label: "Google", icon: FaGoogle },
    { id: "github", label: "GitHub", icon: FaGithub },
    { id: "facebook", label: "Facebook", icon: FaFacebook },
  ];

interface Props {
  disabled?: boolean;
  onSelect: (provider: SocialProvider) => void;
}

export const SocialButtons = ({ disabled, onSelect }: Props) => {
  const t = useTranslations("auth");

  return (
    <>
      <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
        <span className="bg-card text-muted-foreground relative z-10 px-2">
          {t("orContinueWith")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled}
            onClick={() => onSelect(provider.id)}
            aria-label={t("continueWith", { provider: provider.label })}
          >
            <provider.icon aria-hidden />
          </Button>
        ))}
      </div>
    </>
  );
};
