/**
 * "reference" (community genre tree, grow-the-music-tree-api) tracks are MusicBrainz recordings,
 * played via embedded YouTube when a video is linked, so they get a "recordings" endpoint group
 * (list/detail/delete only). Other scopes/track kinds are injected by consumers via
 * `TrackListProvider`'s `listEndpoint`/`listQueryKey` props rather than defined here.
 */
import { makeRecordingQueryKeys, makeRecordingEndpoints } from "./recordings";

export const libraryQueryKeys = {
  reference: {
    recordings: makeRecordingQueryKeys("reference"),
  },
};

export const libraryEndpoints = {
  reference: {
    recordings: makeRecordingEndpoints(),
  },
};
