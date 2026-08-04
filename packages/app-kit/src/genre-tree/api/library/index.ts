/**
 * Only the "uploaded" (uploaded-track library) half of grow's original `src/api/domains/library`
 * moved here — the `spotify` half (`useSpotifyLibTracks.ts`'s Spotify-library-sync endpoints) is a
 * grow-specific feature unrelated to the shared tree+upload+playback workspace and stays behind.
 */
import { makeUploadedQueryKeys, makeUploadedEndpoints } from "./uploaded";

export const libraryQueryKeys = {
  me: {
    uploaded: makeUploadedQueryKeys("me"),
  },
  reference: {
    uploaded: makeUploadedQueryKeys("reference"),
  },
};

export const libraryEndpoints = {
  me: {
    uploaded: makeUploadedEndpoints("me"),
  },
  reference: {
    uploaded: makeUploadedEndpoints("reference"),
  },
};
