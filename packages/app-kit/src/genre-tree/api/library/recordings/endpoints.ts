// grow-api's recordings route only exposes list/retrieve/destroy here — recordings have no
// self-hosted audio and play via an embedded YouTube video when one is linked.
export const makeRecordingEndpoints = () => ({
  list: () => "library/recordings/",
  detail: (uuid: string) => `library/recordings/${uuid}/`,
  delete: (uuid: string) => `library/recordings/${uuid}/`,
});
