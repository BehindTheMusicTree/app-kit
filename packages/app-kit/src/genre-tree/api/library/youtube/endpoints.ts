// gtmt-api's YoutubeTrackViewSet only implements list/retrieve/destroy — no create/update/download
// route, since reference-tree tracks have no self-hosted audio and play via embedded YouTube instead.
export const makeYoutubeEndpoints = () => ({
  list: () => "library/youtube/",
  detail: (uuid: string) => `library/youtube/${uuid}/`,
  delete: (uuid: string) => `library/youtube/${uuid}/`,
});
