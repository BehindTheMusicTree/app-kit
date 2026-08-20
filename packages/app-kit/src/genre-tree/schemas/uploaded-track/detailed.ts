import { z } from "zod";
import { TrackBaseSchema } from "../track/base";
import { FileDetailedSchema } from "./file";

// `kind` is stamped output-side only — see the comment in `../youtube-track/detailed.ts`.
export const UploadedTrackDetailedSchema = TrackBaseSchema.extend({
  relativeUrl: z.string(),
  file: FileDetailedSchema,
}).transform((data) => ({ ...data, kind: "uploaded" as const }));

export type UploadedTrackDetailed = z.infer<typeof UploadedTrackDetailedSchema>;
