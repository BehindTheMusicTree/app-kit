/**
 * Trimmed from grow-the-music-tree-frontend's original `TrackListOrigin.ts`: dropped
 * `TrackListOriginFromPlaylist` (Spotify-library playlist origin, backed by a `PlaylistDetailed`
 * schema that's part of grow's separate Spotify-library feature, out of scope for this package).
 * Only the track and genre-playlist origins — which back this shared tree+upload+playback
 * workspace — are kept.
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
  constructor(public criteriaPlaylist: CriteriaPlaylistMinimum, scope: Scope) {
    super(TrackListOriginType.GENRE_PLAYLIST, criteriaPlaylist.name, criteriaPlaylist.uuid, scope);
  }
}
