import { z } from "zod";
import { TrackBaseSchema } from "../track/base";

export const YOUTUBE_UNPLAYABLE_REASON_LABELS = {
  not_found: "Video unavailable",
  not_embeddable: "Embedding disabled",
  private: "Private video",
  not_processed: "Video still processing",
  region_whitelisted: "Region restricted",
} as const;

export type YoutubeUnplayableReason = keyof typeof YOUTUBE_UNPLAYABLE_REASON_LABELS;

const YOUTUBE_UNPLAYABLE_REASONS = Object.keys(YOUTUBE_UNPLAYABLE_REASON_LABELS) as [
  YoutubeUnplayableReason,
  ...YoutubeUnplayableReason[],
];

// gtmt-api's reference-tree tracks have no self-hosted audio — they play via an embedded
// YouTube video instead. Neither gtmt-api nor htmt-api sends a `kind` tag on the wire: each
// backend only ever serves one track kind from a given route, so the calling code already knows
// which schema to parse a response with. `kind` is stamped here, output-side only, so downstream
// consumers can narrow `TrackDetailed` (see `../track/detailed`) without re-deriving it themselves.
export const YoutubeTrackDetailedSchema = TrackBaseSchema.extend({
  youtubeVideoId: z.string(),
  // null = playable. Defaulted because older API responses omit the key.
  youtubeUnplayableReason: z.enum(YOUTUBE_UNPLAYABLE_REASONS).nullable().default(null),
}).transform((data) => ({ ...data, kind: "youtube" as const }));

export type YoutubeTrackDetailed = z.infer<typeof YoutubeTrackDetailedSchema>;

/** Human-readable reason a track can't be played, or null when it's playable (or not a YouTube track). */
export function unplayableReasonLabel(track: object): string | null {
  if (!("youtubeUnplayableReason" in track)) return null;
  const reason = track.youtubeUnplayableReason as YoutubeUnplayableReason | null | undefined;
  return reason ? YOUTUBE_UNPLAYABLE_REASON_LABELS[reason] : null;
}
