/**
 * "Genre playlists" (backend path `genre-playlists/`) are the item-count-bearing nodes that back
 * the genre tree view — not to be confused with a Spotify-library "playlist" feature (out of scope
 * for this package). Scope-parameterized identically for grow's reference tree and hear's personal
 * tree, per grow's original `src/api/domains/playlists/endpoints.ts`.
 */
export const genrePlaylistEndpoints = {
  me: {
    list: () => "me/genre-playlists/",
    detail: (uuid: string) => `me/genre-playlists/${uuid}/`,
    create: () => "me/genre-playlists/",
    update: (uuid: string) => `me/genre-playlists/${uuid}/`,
    delete: (uuid: string) => `me/genre-playlists/${uuid}/`,
  },
  reference: {
    list: () => "reference/genre-playlists/",
    detail: (uuid: string) => `reference/genre-playlists/${uuid}/`,
    create: () => "reference/genre-playlists/",
    update: (uuid: string) => `reference/genre-playlists/${uuid}/`,
    delete: (uuid: string) => `reference/genre-playlists/${uuid}/`,
  },
};
