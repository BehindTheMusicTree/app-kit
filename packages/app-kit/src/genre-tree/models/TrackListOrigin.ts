/**
 * Trimmed from grow-the-music-tree-frontend's original `TrackListOrigin.ts`: dropped
 * `TrackListOriginFromPlaylist` (Spotify-library playlist origin, backed by a `PlaylistDetailed`
 * schema that's part of grow's separate Spotify-library feature, out of scope for this package).
 * Only the uploaded-track and genre-playlist origins — which back this shared tree+upload+playback
 * workspace — are kept.
 */
import { CriteriaPlaylistDetailed } from "../schemas/criteria-playlist/detailed";
import { TrackDetailed } from "../schemas/track/detailed";
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

export class TrackListOriginFromUploadedTrack extends TrackListOrigin {
  constructor(public uploadedTrack: TrackDetailed, scope: Scope) {
    super(
      TrackListOriginType.UPLOADED_TRACK,
      `${uploadedTrack.title} by ${
        uploadedTrack.artists ? uploadedTrack.artists.map((artist) => artist.name).join(", ") : ""
      }`,
      uploadedTrack.uuid,
      scope,
    );
  }
}

export class TrackListOriginFromCriteriaPlaylist extends TrackListOrigin {
  constructor(public criteriaPlaylist: CriteriaPlaylistDetailed, scope: Scope) {
    super(TrackListOriginType.GENRE_PLAYLIST, criteriaPlaylist.name, criteriaPlaylist.uuid, scope);
  }
}
