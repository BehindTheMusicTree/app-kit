import { TrackBase } from "../schemas/track/base";
import TrackListOrigin, { TrackListOriginFromTrack, TrackListOriginFromCriteriaPlaylist } from "./TrackListOrigin";

export default class TrackList<T extends TrackBase = TrackBase> {
  constructor(
    public tracks: T[],
    public origin: TrackListOrigin,
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
    public origin: TrackListOriginFromCriteriaPlaylist<T>,
  ) {
    super(tracks, origin);
  }
}
