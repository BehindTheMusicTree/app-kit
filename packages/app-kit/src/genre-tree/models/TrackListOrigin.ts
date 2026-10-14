/**
 * Trimmed from grow-the-music-tree-frontend's original `TrackListOrigin.ts`: dropped
 * `TrackListOriginFromPlaylist` (Spotify-library playlist origin, backed by a `PlaylistDetailed`
 * schema that's part of grow's separate Spotify-library feature, out of scope for this package).
 * Kept origins: a single track, a genre playlist, and an artist (a caller-supplied list played
 * through `playNewTrackList`).
 */
import { TrackBase } from "../schemas/track/base";
import { CriteriaPlaylistMinimum } from "../schemas/criteria-playlist/minimum";
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

/** Describes where an arbitrary track list passed to `playNewTrackList` comes from. */
export type ArtistTrackListOriginInput = { type: "artist"; uuid: string; name: string };

export class TrackListOriginFromArtist extends TrackListOrigin {
  constructor(public artist: ArtistTrackListOriginInput, scope: Scope) {
    super(TrackListOriginType.ARTIST, artist.name, artist.uuid, scope);
  }
}
