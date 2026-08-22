import { TrackDetailed } from "../schemas/track/detailed";
import TrackListOrigin, {
  TrackListOriginFromTrack,
  TrackListOriginFromCriteriaPlaylist,
} from "./TrackListOrigin";

export default class TrackList {
  constructor(public tracks: TrackDetailed[], public origin: TrackListOrigin) {}
}

export class TrackListFromTrack extends TrackList {
  constructor(public tracks: TrackDetailed[], public origin: TrackListOriginFromTrack) {
    super(tracks, origin);
  }
}

export class TrackListFromCriteriaPlaylist extends TrackList {
  constructor(public tracks: TrackDetailed[], public origin: TrackListOriginFromCriteriaPlaylist) {
    super(tracks, origin);
  }
}
