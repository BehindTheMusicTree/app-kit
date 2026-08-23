import { z } from "zod";

export const makeTrackPlaylistRelSchema = <T extends z.ZodTypeAny>(trackSchema: T) =>
  z.object({
    track: trackSchema,
    position: z.number().min(0),
  });

export type TrackPlaylistRel<T extends z.ZodTypeAny> = z.infer<ReturnType<typeof makeTrackPlaylistRelSchema<T>>>;
