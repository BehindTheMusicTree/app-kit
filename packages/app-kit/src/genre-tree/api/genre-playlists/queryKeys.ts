export const genrePlaylistQueryKeys = {
  me: {
    all: ["meGenrePlaylists"] as const,
    list: (page: number) => ["meGenrePlaylists", "list", page] as const,
    full: ["meGenrePlaylists", "full"] as const,
    detail: (uuid: string) => ["meGenrePlaylists", uuid] as const,
  },
  // "reference" scope is shared by any number of distinct backends (grow's own reference tree,
  // grow's read-only prototype/demo tree, etc.) that all use the same `scope: "reference"` value
  // but different `getBackendBaseUrl()` results — baseUrl is threaded into these keys so their
  // cache entries don't collide.
  reference: {
    all: ["referenceGenrePlaylists"] as const,
    list: (baseUrl: string, page: number) => ["referenceGenrePlaylists", baseUrl, "list", page] as const,
    full: (baseUrl: string) => ["referenceGenrePlaylists", baseUrl, "full"] as const,
    detail: (baseUrl: string, uuid: string) => ["referenceGenrePlaylists", baseUrl, uuid] as const,
  },
};
