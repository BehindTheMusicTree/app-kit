import { z } from "zod";
import { TrackDetailedSchema } from "../track/detailed";

export const TrackPlaylistRelWithoutPlaylistSchema = z.object({
  track: TrackDetailedSchema,
  position: z.number().min(0),
});

export type TrackPlaylistRel = z.infer<typeof TrackPlaylistRelWithoutPlaylistSchema>;
