/**
 * "reference" (community genre tree, grow-the-music-tree-api) tracks have no self-hosted audio and
 * play via embedded YouTube instead, so they get a "youtube" endpoint group (list/detail/delete
 * only). Other scopes/track kinds are injected by consumers via `TrackListProvider`'s
 * `listEndpoint`/`listQueryKey` props rather than defined here.
 */
import { makeYoutubeQueryKeys, makeYoutubeEndpoints } from "./youtube";

export const libraryQueryKeys = {
  reference: {
    youtube: makeYoutubeQueryKeys("reference"),
  },
};

export const libraryEndpoints = {
  reference: {
    youtube: makeYoutubeEndpoints(),
  },
};
