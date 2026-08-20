/**
 * "Genre playlists" (backend path `genre-playlists/`) are the item-count-bearing nodes that back
 * the genre tree view — not to be confused with a Spotify-library "playlist" feature (out of scope
 * for this package). Scope-parameterized identically for grow's reference tree and hear's personal
 * tree.
 */
const makeGenrePlaylistEndpoints = (prefix: string) => ({
  list: () => `${prefix}genre-playlists/`,
  detail: (uuid: string) => `${prefix}genre-playlists/${uuid}/`,
  create: () => `${prefix}genre-playlists/`,
  update: (uuid: string) => `${prefix}genre-playlists/${uuid}/`,
  delete: (uuid: string) => `${prefix}genre-playlists/${uuid}/`,
});

export const genrePlaylistEndpoints = {
  me: makeGenrePlaylistEndpoints("me/"),
  reference: makeGenrePlaylistEndpoints(""),
};
