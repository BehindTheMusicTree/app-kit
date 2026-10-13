import { z } from "zod";
import { TrackBase, TrackBaseSchema } from "../track/base";

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

// A MusicBrainz recording. `youtubeVideo` is null when no YouTube video is linked yet — the
// recording is still listed, just unplayable.
export const RecordingDetailedSchema = TrackBaseSchema.extend({
  youtubeVideo: z
    .object({
      id: z.string(),
      // null = playable
      unplayableReason: z.enum(YOUTUBE_UNPLAYABLE_REASONS).nullable(),
    })
    .nullable(),
  // null for hand-made/admin recordings
  musicbrainzRecordingId: z.string().uuid().nullable(),
});

export type RecordingDetailed = z.infer<typeof RecordingDetailedSchema>;

export const NO_VIDEO_LABEL = "No video available";

// Shared genre-tree components also render non-recording tracks (e.g. uploaded audio).
export function isRecording(track: TrackBase): track is RecordingDetailed {
  return "youtubeVideo" in track;
}

/** Human-readable reason a recording can't be played, or null when it's playable. */
export function recordingUnplayableReason(recording: RecordingDetailed): string | null {
  if (!recording.youtubeVideo) return NO_VIDEO_LABEL;
  const reason = recording.youtubeVideo.unplayableReason;
  return reason ? YOUTUBE_UNPLAYABLE_REASON_LABELS[reason] : null;
}

/** MusicBrainz recording page URL, or null when the recording has no MBID. */
export function musicBrainzRecordingUrl(recording: RecordingDetailed): string | null {
  return recording.musicbrainzRecordingId ? `https://musicbrainz.org/recording/${recording.musicbrainzRecordingId}` : null;
}
