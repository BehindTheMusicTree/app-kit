/**
 * "reference" (community genre tree, grow-the-music-tree-api) tracks are songs (keyed on a representative MusicBrainz recording id),
 * played via embedded YouTube when a video is linked, so they get a "songs" endpoint group
 * (list/detail/delete only). Other scopes/track kinds are defined by their consumers, not here.
 */
import { makeSongQueryKeys, makeSongEndpoints } from "./songs";

export const libraryQueryKeys = {
  reference: {
    songs: makeSongQueryKeys("reference"),
  },
};

export const libraryEndpoints = {
  reference: {
    songs: makeSongEndpoints(),
  },
};
