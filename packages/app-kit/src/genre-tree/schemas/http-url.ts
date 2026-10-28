import { z } from "zod";

export const HttpUrlSchema = z.url({ protocol: /^https?$/ });
