import { z } from "zod";
import { TrackBaseSchema } from "../track/base";

// gtmt-api's reference-tree tracks have no self-hosted audio — they play via an embedded
// YouTube video instead. Neither gtmt-api nor htmt-api sends a `kind` tag on the wire: each
// backend only ever serves one track kind from a given route, so the calling code already knows
// which schema to parse a response with. `kind` is stamped here, output-side only, so downstream
// consumers can narrow `TrackDetailed` (see `../track/detailed`) without re-deriving it themselves.
export const YoutubeTrackDetailedSchema = TrackBaseSchema.extend({
  youtubeVideoId: z.string(),
}).transform((data) => ({ ...data, kind: "youtube" as const }));

export type YoutubeTrackDetailed = z.infer<typeof YoutubeTrackDetailedSchema>;
