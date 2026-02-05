import { z } from "zod";

export const AgentInsertSchema = z.object({
    name: z.string().min(1, {message: "Name is required"}).max(100),
    instructions: z.string().min(1, {message: "Instructions are required"}),
});