import { z } from "zod";

export function parseWithLog<T>(schema: z.ZodType<T>, data: unknown, context?: string): T {
  if (data == null) {
    const prefix = context ? `[${context}]` : "";
    throw new Error(`${prefix} received null response before schema validation`);
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const prefix = context ? `[${context}]` : "";
    console.error(`${prefix} schema validation failed`, result.error.flatten());
    throw result.error;
  }
  return result.data;
}
