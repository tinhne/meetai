import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { z } from "zod";

export const agentInsertSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  instructions: z
    .string()
    .trim()
    .min(1, { message: "Instructions are required" })
    .max(5000, { message: "Instructions must be at most 5000 characters" }),
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
  search: z.string().max(100).nullish(),
});
