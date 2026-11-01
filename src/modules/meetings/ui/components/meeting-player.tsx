"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

interface MeetingPlayer {
  videoRef: RefObject<HTMLVideoElement | null>;
  currentMs: number;
  isPlaying: boolean;
  hasMedia: boolean;
  seek: (ms: number) => void;
  onTimeUpdate: () => void;
  onPlayingChange: (playing: boolean) => void;
  setHasMedia: (value: boolean) => void;
}

const MeetingPlayerContext = createContext<MeetingPlayer | null>(null);

// Shared playback state so the transcript, chapters and AI citations can
// jump the recording to a moment.
export const MeetingPlayerProvider = ({ children }: { children: ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);

  const seek = useCallback((ms: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, ms / 1000);
    video.scrollIntoView({ behavior: "smooth", block: "nearest" });
    void video.play().catch(() => undefined);
  }, []);

  // Deep links from search results: /dashboard/meetings/:id?t=<seconds>.
  const startHandled = useRef(false);
  useEffect(() => {
    if (!hasMedia || startHandled.current) return;
    startHandled.current = true;
    const startSec = Number(new URLSearchParams(window.location.search).get("t"));
    if (Number.isFinite(startSec) && startSec > 0) seek(startSec * 1000);
  }, [hasMedia, seek]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) setCurrentMs(Math.round(video.currentTime * 1000));
  }, []);

  const value = useMemo(
    () => ({
      videoRef,
      currentMs,
      isPlaying,
      hasMedia,
      seek,
      onTimeUpdate,
      onPlayingChange: setIsPlaying,
      setHasMedia,
    }),
    [currentMs, isPlaying, hasMedia, seek, onTimeUpdate],
  );

  return <MeetingPlayerContext.Provider value={value}>{children}</MeetingPlayerContext.Provider>;
};

export const useMeetingPlayer = () => useContext(MeetingPlayerContext);
