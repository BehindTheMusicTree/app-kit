import { TrackBase } from "../schemas/track/base";
import TrackListOrigin, { TrackListOriginFromTrack, TrackListOriginFromCriteriaPlaylist } from "./TrackListOrigin";

export default class TrackList<T extends TrackBase = TrackBase> {
  constructor(
    public tracks: T[],
    public origin: TrackListOrigin,
    /** Tracks in the whole origin, loaded or not. */
    public total: number = tracks.length,
    /** Next page to fetch, or null once every track is loaded. */
    public nextPage: number | null = null,
  ) {}
}

export class TrackListFromTrack<T extends TrackBase = TrackBase> extends TrackList<T> {
  constructor(
    public tracks: T[],
    public origin: TrackListOriginFromTrack<T>,
  ) {
    super(tracks, origin);
  }
}

export class TrackListFromCriteriaPlaylist<T extends TrackBase = TrackBase> extends TrackList<T> {
  constructor(
    public tracks: T[],
    public origin: TrackListOriginFromCriteriaPlaylist,
    total: number,
    nextPage: number | null,
  ) {
    super(tracks, origin, total, nextPage);
  }
}
