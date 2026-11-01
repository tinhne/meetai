import { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

export type MeetingGetOne = inferRouterOutputs<AppRouter>["meetings"]["getOne"];

export type MeetingGetMany =
  inferRouterOutputs<AppRouter>["meetings"]["getMany"]["items"];

export enum MeetingStatus {
  Upcoming = "upcoming",
  Active = "active",
  Completed = "completed",
  Processing = "processing",
  Cancelled = "cancelled",
  Failed = "failed",
}

export type StreamTranscriptItem = {
  speaker_id: string;
  type: string;
  text: string;
  start_ts: number;
  end_ts: number;
  user?: {
    id?: string;
    name: string;
    image: string;
  };
};

export const MEETING_VIEWS = ["upcoming", "past", "all"] as const;
export type MeetingView = (typeof MEETING_VIEWS)[number];

export type MeetingActionItems =
  inferRouterOutputs<AppRouter>["meetings"]["getActionItems"];
