import { z } from "zod";

import { ArtistMinimumSchema } from "../artist-minimum";
import { AlbumMinimumSchema } from "../album-minimum";
import { CriteriaMinimumSchema } from "../criteria/minimum";
import { CriteriaPlaylistMinimumSchema } from "../criteria-playlist/minimum";
import { UuidResourceSchema } from "../uuid-resource";

// Fields shared by every track kind (uploaded, youtube). Playback-specific fields
// (file/relativeUrl vs youtubeVideoId) live on each kind's own schema instead.
export const TrackBaseSchema = UuidResourceSchema.extend({
  title: z.string(),
  artists: z.array(ArtistMinimumSchema).nullable().optional(),
  album: AlbumMinimumSchema.nullable().optional(),
  trackNumber: z.number().nullable().optional(),
  genre: CriteriaMinimumSchema,
  rating: z.number().min(0).max(10).nullable().optional(),
  language: z.string().nullable().optional(),
  playlists: z.array(CriteriaPlaylistMinimumSchema),
  playCount: z.number().min(0),
  archived: z.boolean(),
  createdOn: z.string().datetime(),
  updatedOn: z.string().datetime().nullable().optional(),
});

export type TrackBase = z.infer<typeof TrackBaseSchema>;
