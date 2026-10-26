// grow-api's songs route only exposes list/retrieve/destroy here — songs have no
// self-hosted audio and play via an embedded YouTube video when one is linked.
export const makeSongEndpoints = () => ({
  list: () => "library/songs/",
  detail: (uuid: string) => `library/songs/${uuid}/`,
  delete: (uuid: string) => `library/songs/${uuid}/`,
});
