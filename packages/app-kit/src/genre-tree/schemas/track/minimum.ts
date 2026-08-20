import { z } from "zod";
import { TrackBaseSchema } from "./base";

export const TrackMinimumSchema = TrackBaseSchema.pick({
  uuid: true,
  title: true,
  artists: true,
});

export type TrackMinimum = z.infer<typeof TrackMinimumSchema>;
