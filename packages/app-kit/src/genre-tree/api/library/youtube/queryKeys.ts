export const makeYoutubeQueryKeys = (prefix: string) => ({
  all: [`${prefix}YoutubeTracks`] as const,
  list: (page: number) => [`${prefix}YoutubeTracks`, "list", page] as const,
  detail: (uuid: string) => [`${prefix}YoutubeTracks`, "detail", uuid] as const,
});
