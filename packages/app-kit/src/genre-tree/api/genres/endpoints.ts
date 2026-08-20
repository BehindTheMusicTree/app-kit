export const genreEndpoints = {
  me: {
    list: () => "me/genres/",
    detail: (id: string) => `me/genres/${id}/`,
    loadExampleTree: () => "me/genres/tree/load-example/",
    create: () => "me/genres/",
    update: (id: string) => `me/genres/${id}/`,
    delete: (id: string) => `me/genres/${id}/`,
  },
  reference: {
    list: () => "genres/",
    detail: (id: string) => `genres/${id}/`,
    loadExampleTree: () => "genres/tree/load-example/",
    create: () => "genres/",
    update: (id: string) => `genres/${id}/`,
    delete: (id: string) => `genres/${id}/`,
  },
};
