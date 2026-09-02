// Tree view + data hooks
export * from "./GenreTreeView";
export * from "./GenreTreeSkeleton";
export * from "./GenreTreeWheelSkeleton";
export * from "./GenreTreeViewSkeleton";
export { default as GenrePlaylistTreePerRoot } from "./playlist-tree/TreePerRoot";
export type { GenrePlaylistTreePerRootProps } from "./playlist-tree/TreePerRoot";
export type { GenreTreeAction } from "@behindthemusictree/genre-tree-view";
export * from "./useGenre";
export * from "./useGenrePlaylist";

// Playback/track-list plumbing
export * from "./TrackListContext";
export * from "./TrackListSidebarVisibilityContext";
export { default as TrackListSidebar } from "./track-list-sidebar/TrackListSidebar";
export type { TrackListSidebarProps } from "./track-list-sidebar/TrackListSidebar";
export { default as TrackItem } from "./track-list-sidebar/TrackItem";
export type { TrackItemProps } from "./track-list-sidebar/TrackItem";
export { default as TrackPositionPlayPause } from "./TrackPositionPlayPause";
export type { TrackPositionPlayPauseProps } from "./TrackPositionPlayPause";
export { default as Rating } from "./Rating";
export type { RatingProps } from "./Rating";

// Models
export { default as TrackList, TrackListFromTrack, TrackListFromCriteriaPlaylist } from "./models/TrackList";
export {
  default as TrackListOrigin,
  TrackListOriginFromTrack,
  TrackListOriginFromCriteriaPlaylist,
} from "./models/TrackListOrigin";
export type { CriteriaPlaylistDetailedLike } from "./models/TrackListOrigin";
export * from "./models/TrackListOriginType";

// Schemas / domain types
export * from "./schemas/uuid-resource";
export * from "./schemas/artist-minimum";
export * from "./schemas/album-minimum";
export * from "./schemas/mb-artist";
export * from "./schemas/mb-recording";
export * from "./schemas/criteria/minimum";
export * from "./schemas/criteria/simple";
export * from "./schemas/criteria/detailed";
export * from "./schemas/criteria/creation";
export * from "./schemas/criteria/update";
export * from "./schemas/criteria/lineage-rel/without-ascendant";
export * from "./schemas/criteria/lineage-rel/without-descendant";
export * from "./schemas/criteria-playlist/minimum";
export * from "./schemas/criteria-playlist/simple";
export * from "./schemas/criteria-playlist/detailed";
export * from "./schemas/youtube-track/detailed";
export * from "./schemas/track/base";
export * from "./schemas/track/minimum";
export * from "./schemas/track-playlist-rel/without-playlist";

// API domain contracts
export { genreEndpoints, genreQueryKeys } from "./api/genres";
export { genrePlaylistEndpoints, genrePlaylistQueryKeys } from "./api/genre-playlists";
export { libraryEndpoints, libraryQueryKeys } from "./api/library";

// Misc lib helpers
export * from "./lib/rating";
export * from "./lib/formatting";
export * from "./lib/genre-playlist-helpers";
