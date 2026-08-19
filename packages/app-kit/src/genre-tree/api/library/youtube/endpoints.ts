// gtmt-api's YoutubeTrackViewSet only implements list/retrieve/destroy — no create/update/download
// route, since reference-tree tracks have no self-hosted audio and play via embedded YouTube instead.
export const makeYoutubeEndpoints = (root: string) => ({
  list: () => `${root}/library/youtube/`,
  detail: (uuid: string) => `${root}/library/youtube/${uuid}/`,
  delete: (uuid: string) => `${root}/library/youtube/${uuid}/`,
});
