import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { z } from "zod";

export const meetingInsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }).max(100),
  agentId: z.string().min(1, { message: "Agent ID is required" }),
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
  search: z.string().nullish(),
});
