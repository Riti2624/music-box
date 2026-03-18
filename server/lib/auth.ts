import type { Request } from "express";
import { z } from "zod";

const userIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export function getRequiredUserId(req: Request): string {
  const value = req.header("x-user-id");
  const parsed = userIdSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error("Missing or invalid x-user-id header");
  }

  return parsed.data;
}
