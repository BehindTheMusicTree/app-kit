import { TrackDetailed } from "../schemas/track/detailed";
import TrackListOrigin, {
  TrackListOriginFromUploadedTrack,
  TrackListOriginFromCriteriaPlaylist,
} from "./TrackListOrigin";

export default class TrackList {
  constructor(public uploadedTracks: TrackDetailed[], public origin: TrackListOrigin) {}
}

export class TrackListFromUploadedTrack extends TrackList {
  constructor(public uploadedTracks: TrackDetailed[], public origin: TrackListOriginFromUploadedTrack) {
    super(uploadedTracks, origin);
  }
}

export class TrackListFromCriteriaPlaylist extends TrackList {
  constructor(public uploadedTracks: TrackDetailed[], public origin: TrackListOriginFromCriteriaPlaylist) {
    super(uploadedTracks, origin);
  }
}
