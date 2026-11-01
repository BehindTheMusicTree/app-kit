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

// A song, keyed on a MusicBrainz recording. `youtubeVideo` is null when no YouTube video is linked yet — the
// song is still listed, just unplayable.
export const SongDetailedSchema = TrackBaseSchema.extend({
  youtubeVideo: z
    .object({
      id: z.string(),
      // null = playable
      unplayableReason: z.enum(YOUTUBE_UNPLAYABLE_REASONS).nullable(),
    })
    .nullable(),
  // null for hand-made/admin songs
  musicbrainzRecordingId: z.string().uuid().nullable(),
});

export type SongDetailed = z.infer<typeof SongDetailedSchema>;

export const NO_VIDEO_LABEL = "No video available";

// Shared genre-tree components also render non-song tracks (e.g. uploaded audio).
export function isSong(track: TrackBase): track is SongDetailed {
  return "youtubeVideo" in track;
}

/** Human-readable reason a song can't be played, or null when it's playable. */
export function songUnplayableReason(song: SongDetailed): string | null {
  if (!song.youtubeVideo) return NO_VIDEO_LABEL;
  const reason = song.youtubeVideo.unplayableReason;
  return reason ? YOUTUBE_UNPLAYABLE_REASON_LABELS[reason] : null;
}

/** MusicBrainz recording page URL, or null when the song has no MBID. */
export function musicBrainzRecordingUrl(song: SongDetailed): string | null {
  return song.musicbrainzRecordingId ? `https://musicbrainz.org/recording/${song.musicbrainzRecordingId}` : null;
}
