/**
 * Trimmed from grow-the-music-tree-frontend's original `TrackListOrigin.ts`: dropped
 * `TrackListOriginFromPlaylist` (Spotify-library playlist origin, backed by a `PlaylistDetailed`
 * schema that's part of grow's separate Spotify-library feature, out of scope for this package).
 * Kept origins: a single track, a genre playlist, and an artist (their playable songs,
 * paged through `playNewTrackListFromArtist`).
 */
import { TrackBase } from "../schemas/track/base";
import { CriteriaPlaylistMinimum } from "../schemas/criteria-playlist/minimum";
import type { GenreUuid } from "../schemas/ids";
import { Scope } from "../../transport/lib/scope";
import { TrackListOriginType } from "./TrackListOriginType";

export default class TrackListOrigin {
  constructor(
    public type: TrackListOriginType,
    public label: string,
    public uuid: string,
    public scope: Scope,
  ) {}
}

export class TrackListOriginFromTrack<T extends TrackBase = TrackBase> extends TrackListOrigin {
  constructor(public track: T, scope: Scope) {
    super(
      TrackListOriginType.TRACK,
      `${track.title} by ${track.artists ? track.artists.map((artist) => artist.name).join(", ") : ""}`,
      track.uuid,
      scope,
    );
  }
}

export class TrackListOriginFromCriteriaPlaylist extends TrackListOrigin {
  /** `from`: the track the list starts at (server-side `?from=`), kept so later pages use it too. */
  constructor(
    public criteriaPlaylist: CriteriaPlaylistMinimum,
    scope: Scope,
    public from?: string,
  ) {
    super(TrackListOriginType.GENRE_PLAYLIST, criteriaPlaylist.name, criteriaPlaylist.uuid, scope);
  }
}

export type ArtistSongsOrdering = "title" | "-title" | "albumYear" | "-albumYear";

export type ArtistTrackListOriginInput = { uuid: string; name: string };

export class TrackListOriginFromArtist extends TrackListOrigin {
  /** `ordering`/`from`: kept so later pages use the same order and start track. */
  constructor(
    public artist: ArtistTrackListOriginInput,
    scope: Scope,
    public ordering: ArtistSongsOrdering,
    public from?: string,
    /** Narrows the artist's songs to this genre's subtree. */
    public genreUuid?: GenreUuid,
  ) {
    super(TrackListOriginType.ARTIST, artist.name, artist.uuid, scope);
  }
}
