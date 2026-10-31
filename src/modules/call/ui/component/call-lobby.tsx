"use client";

import {
  AudioVolumeIndicator,
  DefaultVideoPlaceholder,
  DeviceSelectorAudioInput,
  DeviceSelectorVideo,
  StreamVideoParticipant,
  ToggleAudioPreviewButton,
  ToggleVideoPreviewButton,
  useCallStateHooks,
  useConnectedUser,
  VideoPreview,
} from "@stream-io/video-react-sdk";
import { LogInIcon, ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { useCallRoom } from "./call-context";

interface Props {
  onJoin: () => Promise<void>;
}

const DisabledVideoPreview = () => {
  const user = useConnectedUser();
  return (
    <DefaultVideoPlaceholder
      participant={
        { name: user?.name ?? "", image: user?.image } as StreamVideoParticipant
      }
    />
  );
};

export const CallLobby = ({ onJoin }: Props) => {
  const t = useTranslations("call");
  const { meetingName, backHref } = useCallRoom();
  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const { hasBrowserPermission: hasCameraPermission } = useCameraState();
  const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
  const [consent, setConsent] = useState(false);
  const [joining, setJoining] = useState(false);

  const join = async () => {
    setJoining(true);
    try {
      await onJoin();
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-radial from-sidebar-accent to-stage p-4">
      <div className="w-full max-w-xl rounded-2xl bg-card text-card-foreground p-6 shadow-lg md:p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <p className="text-sm text-muted-foreground">{meetingName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("lobbyTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("lobbySubtitle")}</p>
        </div>

        <div className="overflow-hidden rounded-xl bg-stage [&_.str-video__video-preview-container]:mx-auto">
          <VideoPreview DisabledVideoPreview={DisabledVideoPreview} />
        </div>
        {!(hasCameraPermission && hasMicPermission) && (
          <p className="text-center text-sm text-warning">{t("permissionHint")}</p>
        )}

        <div className="flex items-center justify-center gap-2">
          <ToggleAudioPreviewButton />
          <ToggleVideoPreviewButton />
          <AudioVolumeIndicator />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DeviceSelectorAudioInput title={t("microphone")} visualType="dropdown" />
          <DeviceSelectorVideo title={t("camera")} visualType="dropdown" />
        </div>

        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(value) => setConsent(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="consent" className="text-sm font-normal leading-snug">
            <ShieldCheckIcon className="mr-1 inline size-4 text-primary" />
            {t("consent")}
          </Label>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {backHref ? (
            <Button asChild variant="ghost">
              <Link href={backHref}>{t("cancel")}</Link>
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={join} disabled={!consent || joining}>
            <LogInIcon />
            {t("join")}
          </Button>
        </div>
      </div>
    </div>
  );
};
