import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { z } from "zod";
import { AI_MODES, MEETING_TEMPLATES } from "@/config/ai";
import { MEETING_LANGUAGES } from "../lib/stream";
import { MEETING_VIEWS, MeetingStatus } from "../types";

export const meetingInsertSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  agentId: z.string().min(1, { message: "Agent ID is required" }),
  language: z.enum(MEETING_LANGUAGES),
  template: z.enum(MEETING_TEMPLATES),
  aiMode: z.enum(AI_MODES),
  agenda: z
    .string()
    .trim()
    .max(2000, { message: "Agenda must be at most 2000 characters" })
    .optional(),
  // UTC ISO string, e.g. "2026-11-01T09:00:00.000Z"
  scheduledAt: z.iso.datetime().optional(),
});

export const meetingUpdateSchema = meetingInsertSchema.extend({
  id: z.string().min(1, { message: "ID is required" }),
});

export const meetingFilterSchema = z.object({
  page: z.number().min(MIN_PAGE_SIZE).default(DEFAULT_PAGE),
  pageSize: z
    .number()
    .min(MIN_PAGE_SIZE)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().max(100).nullish(),
  agentId: z.string().nullish(),
  status: z.enum(MeetingStatus).nullish(),
  // Tabs: upcoming/live, past (finished or failed), all
  view: z.enum(MEETING_VIEWS).default("all"),
});
