import { z } from "zod";

export function parseWithLog<T>(schema: z.ZodType<T, unknown>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const prefix = context ? `[${context}]` : "";
    if (data == null) {
      throw new Error(`${prefix} received null response before schema validation`);
    }
    console.error(`${prefix} schema validation failed`, z.flattenError(result.error));
    throw result.error;
  }
  return result.data;
}
