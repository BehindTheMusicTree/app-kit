export const makeRecordingQueryKeys = (prefix: string) => ({
  all: [`${prefix}Recordings`] as const,
  list: (page: number) => [`${prefix}Recordings`, "list", page] as const,
  detail: (uuid: string) => [`${prefix}Recordings`, "detail", uuid] as const,
});
