import { z } from "zod";
import { UploadedTrackDetailedSchema } from "../uploaded-track/detailed";

export const UploadedTrackPlaylistRelWithoutPlaylistSchema = z.object({
  uploadedTrack: UploadedTrackDetailedSchema,
  position: z.number().min(0),
});

export type UploadedTrackPlaylistRel = z.infer<typeof UploadedTrackPlaylistRelWithoutPlaylistSchema>;
