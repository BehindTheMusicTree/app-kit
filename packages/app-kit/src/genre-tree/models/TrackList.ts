import { UploadedTrackDetailed } from "../schemas/uploaded-track/detailed";
import TrackListOrigin, {
  TrackListOriginFromUploadedTrack,
  TrackListOriginFromCriteriaPlaylist,
} from "./TrackListOrigin";

export default class TrackList {
  constructor(public uploadedTracks: UploadedTrackDetailed[], public origin: TrackListOrigin) {}
}

export class TrackListFromUploadedTrack extends TrackList {
  constructor(public uploadedTracks: UploadedTrackDetailed[], public origin: TrackListOriginFromUploadedTrack) {
    super(uploadedTracks, origin);
  }
}

export class TrackListFromCriteriaPlaylist extends TrackList {
  constructor(public uploadedTracks: UploadedTrackDetailed[], public origin: TrackListOriginFromCriteriaPlaylist) {
    super(uploadedTracks, origin);
  }
}
