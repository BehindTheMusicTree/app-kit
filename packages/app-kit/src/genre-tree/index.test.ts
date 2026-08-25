import { describe, it, expect } from "vitest";

import * as genreTree from "./index";

describe("genre-tree barrel", () => {
  it("re-exports tree view components and data hooks", () => {
    expect(genreTree.GenreTreeSkeleton).toBeTypeOf("function");
    expect(genreTree.GenrePlaylistTreePerRoot).toBeTypeOf("function");
    expect(genreTree.useListGenres).toBeTypeOf("function");
    expect(genreTree.useFetchGenre).toBeTypeOf("function");
    expect(genreTree.useListGenrePlaylists).toBeTypeOf("function");
    expect(genreTree.useFetchGenrePlaylist).toBeTypeOf("function");
  });

  it("re-exports playback/track-list plumbing", () => {
    expect(genreTree.TrackListProvider).toBeTypeOf("function");
    expect(genreTree.useListTracks).toBeTypeOf("function");
    expect(genreTree.useTrackList).toBeTypeOf("function");
    expect(genreTree.TrackListSidebarVisibilityProvider).toBeTypeOf("function");
    expect(genreTree.useTrackListSidebarVisibility).toBeTypeOf("function");
    expect(genreTree.TrackListSidebar).toBeTypeOf("function");
    expect(genreTree.TrackItem).toBeTypeOf("function");
    expect(genreTree.TrackPositionPlayPause).toBeTypeOf("function");
    expect(genreTree.Rating).toBeTypeOf("function");
  });

  it("re-exports models", () => {
    expect(genreTree.TrackList).toBeTypeOf("function");
    expect(genreTree.TrackListFromTrack).toBeTypeOf("function");
    expect(genreTree.TrackListFromCriteriaPlaylist).toBeTypeOf("function");
    expect(genreTree.TrackListOrigin).toBeTypeOf("function");
    expect(genreTree.TrackListOriginFromTrack).toBeTypeOf("function");
    expect(genreTree.TrackListOriginFromCriteriaPlaylist).toBeTypeOf("function");
  });

  it("re-exports schemas", () => {
    expect(genreTree.UuidResourceSchema).toBeTypeOf("object");
    expect(genreTree.ArtistMinimumSchema).toBeTypeOf("object");
    expect(genreTree.AlbumMinimumSchema).toBeTypeOf("object");
    expect(genreTree.MbArtistDetailedSchema).toBeTypeOf("object");
    expect(genreTree.MbRecordingDetailedSchema).toBeTypeOf("object");
    expect(genreTree.CriteriaMinimumSchema).toBeTypeOf("object");
    expect(genreTree.CriteriaPlaylistDetailedBaseSchema).toBeTypeOf("object");
    expect(genreTree.CriteriaPlaylistSimpleSchema).toBeTypeOf("object");
    expect(genreTree.YoutubeTrackDetailedSchema).toBeTypeOf("object");
    expect(genreTree.TrackBaseSchema).toBeTypeOf("object");
    expect(genreTree.makeTrackPlaylistRelSchema).toBeTypeOf("function");
  });

  it("re-exports API domain contracts", () => {
    expect(genreTree.genreEndpoints).toBeDefined();
    expect(genreTree.genreQueryKeys).toBeDefined();
    expect(genreTree.genrePlaylistEndpoints).toBeDefined();
    expect(genreTree.genrePlaylistQueryKeys).toBeDefined();
    expect(genreTree.libraryEndpoints).toBeDefined();
    expect(genreTree.libraryQueryKeys).toBeDefined();
  });

  it("re-exports misc lib helpers", () => {
    expect(genreTree.FORM_RATING_NULL_VALUE).toBe(-1);
    expect(genreTree.formatTime).toBeTypeOf("function");
    expect(genreTree.capitalizeFirstLetter).toBeTypeOf("function");
    expect(genreTree.getGenrePlaylistsGroupedByRoot).toBeTypeOf("function");
  });
});
