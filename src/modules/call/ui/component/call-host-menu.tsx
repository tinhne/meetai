"use client";

import { useMutation } from "@tanstack/react-query";
import { MicOffIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AI_MODES, JOIN_MODES, type AiMode, type JoinMode } from "@/config/ai";
import { useTRPC } from "@/trpc/client";
import { useCallRoom } from "./call-context";

interface Props {
  aiMode: AiMode;
  onAiModeChange: (mode: AiMode) => void;
}

export const CallHostMenu = ({ aiMode, onAiModeChange }: Props) => {
  const t = useTranslations("call");
  const tAi = useTranslations("aiModes");
  const tJoin = useTranslations("joinModes");
  const trpc = useTRPC();
  const { meetingId, joinMode: initialJoinMode } = useCallRoom();
  const [joinMode, setJoinMode] = useState(initialJoinMode);

  const setAi = useMutation(
    trpc.meetings.setAiMode.mutationOptions({
      onSuccess: ({ aiMode: mode }) => onAiModeChange(mode),
      onError: (error) => toast.error(error.message),
    }),
  );
  const setJoin = useMutation(
    trpc.meetings.setJoinMode.mutationOptions({
      onSuccess: ({ joinMode: mode }) => setJoinMode(mode),
      onError: (error) => toast.error(error.message),
    }),
  );
  const muteAll = useMutation(
    trpc.meetings.muteParticipants.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="size-11 rounded-full"
          aria-label={t("hostMenu")}
        >
          <SettingsIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-72">
        <DropdownMenuLabel>{t("aiMode")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={aiMode}
          onValueChange={(value) => setAi.mutate({ id: meetingId, aiMode: value as AiMode })}
        >
          {AI_MODES.map((mode) => (
            <DropdownMenuRadioItem key={mode} value={mode} disabled={setAi.isPending}>
              {tAi(mode)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("joinMode")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={joinMode}
          onValueChange={(value) =>
            setJoin.mutate({ id: meetingId, joinMode: value as JoinMode })
          }
        >
          {JOIN_MODES.map((mode) => (
            <DropdownMenuRadioItem key={mode} value={mode} disabled={setJoin.isPending}>
              {tJoin(mode)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => muteAll.mutate({ id: meetingId })}>
          <MicOffIcon />
          {t("muteAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
