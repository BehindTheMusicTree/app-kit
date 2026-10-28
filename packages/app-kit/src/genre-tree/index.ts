// Data hooks + view state
export * from "./useGenre";
export * from "./useGenrePlaylist";
export * from "./useArtist";
export * from "./useArtistSearch";
export * from "./useArtistGenreCounts";
export * from "./useGenreSearch";
export * from "./useGenreTreeViewState";
export * from "./useVisibleGenrePlaylists";

// Playback/track-list plumbing
export * from "./TrackListContext";
export * from "./TrackListSidebarVisibilityContext";
export { ArtistNames } from "./ArtistNames";
export type { RenderArtistLink } from "./ArtistNames";

// Models
export {
  default as TrackList,
  TrackListFromTrack,
  TrackListFromCriteriaPlaylist,
  TrackListFromArtist,
} from "./models/TrackList";
export {
  default as TrackListOrigin,
  TrackListOriginFromTrack,
  TrackListOriginFromCriteriaPlaylist,
  TrackListOriginFromArtist,
} from "./models/TrackListOrigin";
export type { ArtistTrackListOriginInput, ArtistSongsOrdering } from "./models/TrackListOrigin";
export * from "./models/TrackListOriginType";

// Schemas / domain types
export * from "./schemas/uuid-resource";
export * from "./schemas/ids";
export * from "./schemas/artist-minimum";
export * from "./schemas/artist-search";
export * from "./schemas/artist-detailed";
export * from "./schemas/artist-genre-count";
export * from "./schemas/album-minimum";
export * from "./schemas/mb-artist";
export * from "./schemas/mb-recording";
export * from "./schemas/criteria/minimum";
export * from "./schemas/criteria/simple";
export * from "./schemas/criteria/detailed";
export * from "./schemas/criteria/overview";
export * from "./schemas/criteria/creation";
export * from "./schemas/criteria/update";
export * from "./schemas/criteria/lineage-rel/without-ascendant";
export * from "./schemas/criteria/lineage-rel/without-descendant";
export * from "./schemas/criteria-playlist/minimum";
export * from "./schemas/criteria-playlist/simple";
export * from "./schemas/criteria-playlist/detailed";
export * from "./schemas/song/detailed";
export * from "./schemas/track/base";
export * from "./schemas/track/minimum";
export * from "./schemas/track-playlist-rel/without-playlist";

// API domain contracts
export { genreEndpoints, genreQueryKeys } from "./api/genres";
export { artistEndpoints, artistQueryKeys } from "./api/artists";
export { genrePlaylistEndpoints, genrePlaylistQueryKeys } from "./api/genre-playlists";
export { libraryEndpoints, libraryQueryKeys } from "./api/library";

// Misc lib helpers
export * from "./lib/rating";
export * from "./lib/formatting";
export * from "./lib/genre-playlist-helpers";
export * from "./lib/prune-genre-playlists-for-artist";
export * from "./lib/genre-search";
export * from "./lib/reparent-candidates";
export * from "./lib/genre-songs-cache";
