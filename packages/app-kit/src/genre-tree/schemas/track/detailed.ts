import { z } from "zod";
import { UploadedTrackDetailedSchema } from "../uploaded-track/detailed";
import { YoutubeTrackDetailedSchema } from "../youtube-track/detailed";

// Generic track shape for consumers that render/play either kind (list rendering, playback,
// track-list origin) without caring which. A plain `z.union` (not `z.discriminatedUnion`) is used
// deliberately: the raw JSON on the wire has no `kind` field to route on (see the comment in
// `../youtube-track/detailed.ts`), so each member schema stamps its own `kind` via `.transform()`
// and zod falls through to whichever member structurally matches. Upload-only surfaces (upload,
// edit) should import `UploadedTrackDetailed` directly instead of this union.
export const TrackDetailedSchema = z.union([UploadedTrackDetailedSchema, YoutubeTrackDetailedSchema]);

export type TrackDetailed = z.infer<typeof TrackDetailedSchema>;
