import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { MeetingStatus } from "@/modules/meetings/types";
import { z } from "zod";

export const agentInsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }).max(100),
  instructions: z.string().min(1, { message: "Instructions are required" }),
});

export const agentsUpdateSchema = agentInsertSchema.extend({
  id: z.string().min(1, { message: "ID is required" }),
});

export const agentFilterSchema = z.object({
  page: z.number().min(MIN_PAGE_SIZE).default(DEFAULT_PAGE),
  pageSize: z
    .number()
    .min(MIN_PAGE_SIZE)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().nullish(),
  agentId: z.string().nullish(),
  status: z
    .enum([
      MeetingStatus.Upcoming,
      MeetingStatus.Active,
      MeetingStatus.Completed,
      MeetingStatus.Processing,
      MeetingStatus.Cancelled,
    ])
    .nullish(),
});
