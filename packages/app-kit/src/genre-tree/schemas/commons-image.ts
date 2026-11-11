import { z } from "zod";

import { HttpUrlSchema } from "./http-url";

/** A Wikimedia Commons image with the attribution its license requires. */
export const CommonsImageSchema = z.object({
  url: HttpUrlSchema,
  pageUrl: HttpUrlSchema,
  author: z.string().nullable(),
  license: z.string(),
  licenseUrl: HttpUrlSchema.nullable(),
});

export type CommonsImage = z.infer<typeof CommonsImageSchema>;
