/**
 * "me" (real self-hosted audio, hear-the-music-tree-api) and "reference" (community genre tree,
 * grow-the-music-tree-api) back different backends with different capabilities — reference tracks
 * have no self-hosted audio and play via embedded YouTube instead, so they get a separate
 * "youtube" endpoint group (list/detail/delete only) rather than sharing "uploaded"'s shape.
 */
import { makeUploadedQueryKeys, makeUploadedEndpoints } from "./uploaded";
import { makeYoutubeQueryKeys, makeYoutubeEndpoints } from "./youtube";

export const libraryQueryKeys = {
  me: {
    uploaded: makeUploadedQueryKeys("me"),
  },
  reference: {
    youtube: makeYoutubeQueryKeys("reference"),
  },
};

export const libraryEndpoints = {
  me: {
    uploaded: makeUploadedEndpoints("me"),
  },
  reference: {
    youtube: makeYoutubeEndpoints(),
  },
};
