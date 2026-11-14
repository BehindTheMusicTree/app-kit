import { test as base, expect } from "@playwright/test";

export const pop = "10000000-0000-4000-8000-000000000001";
export const rock = "10000000-0000-4000-8000-000000000002";
export const artistUuid = "10000000-0000-4000-8000-000000000003";
const counts = { genreOnlyTracksCount: 0, genreAndSubgenresTracksCount: { canonical: 0, regional: 0, all: 0 } };
const genres = [{ uuid: pop, name: "Picture Pop" }, { uuid: rock, name: "Imageless Rock" }];
const playlists = genres.map((genre, index) => {
  const uuid = `20000000-0000-4000-8000-00000000000${index + 1}`;
  return { uuid, name: genre.name, criteria: genre, root: { uuid, name: genre.name }, parent: null,
    tracksCount: 0, ...counts, catalogue: counts, viewsCount: 0, isUnacceptedRoot: false,
    createdOn: "2026-01-01T00:00:00Z", updatedOn: null };
});
const image = { url: "https://images.test/cover.svg", pageUrl: "https://commons.wikimedia.org/wiki/File:Fixture.jpg",
  author: "Fixture photographer", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" };
const searchGenres = genres.map((genre, index) => ({ ...genre, wikidataId: null, treeName: "canonical",
  genrePlaylistUuid: playlists[index].uuid, root: genre, isUmbrella: false, viewsCount: 0 }));
const emptyPage = { overallTotal: 0, results: [], page: 1, pageSize: 50, totalPages: 0, next: null, previous: null };

export const test = base.extend<{ fixtureApi: void }>({
  fixtureApi: [async ({ page }, use) => {
    const unexpected: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://images.test/**", (route) => route.fulfill({ contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#589e80"/></svg>' }));
    await page.route("**/api/grow-prototype-proxy/**", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace("/api/grow-prototype-proxy/", "");
      let data: unknown;
      if (path === "genre-playlists/tree/") data = playlists;
      else if (path === "regions/map/genres/") data = [];
      else if (path === "genres/search/") data = searchGenres.filter((genre) => genre.name.toLowerCase().includes((url.searchParams.get("q") ?? "").toLowerCase()));
      else if (path === "artists/search/") data = [];
      else if (path === "library/songs/search/") data = [];
      else if (path === "library/songs/") data = emptyPage;
      else if (path === `artists/${artistUuid}/genre-counts/`) data = [];
      else if (path === `artists/${artistUuid}/`) data = {
        uuid: artistUuid, name: "Cover Artist", musicbrainzArtistId: null, type: "person", country: null,
        beginYear: null, endYear: null, ended: false, links: [], members: [], memberOf: [], albums: [],
        tracksCount: 0, playableTracksCount: 0, image, origin: null,
      };
      else {
        const genre = genres.find((genre) => path === `genres/${genre.uuid}/` || path === `genres/${genre.uuid}/overview/`);
        if (genre) {
          data = path.endsWith("/overview/") ? {
            ...genre, summary: `${genre.name} summary. `.repeat(100), description: null, summarySourceUrl: null,
            image: genre.uuid === pop ? image : null,
          } : { ...genre, summary: null, parent: null, ascendants: [], children: [], root: genre,
            catalogue: counts, criteriaPlaylist: null, essentialSongs: [], tracksCount: 0, updatedOn: null };
        } else {
          unexpected.push(`${route.request().method()} ${path}${url.search}`);
          await route.fulfill({ status: 500, json: { error: "Unexpected fixture request" } });
          return;
        }
      }
      await route.fulfill({ json: data });
    });
    await use();
    expect(unexpected, "all API calls must have deterministic fixtures").toEqual([]);
    expect(errors, "browser runtime errors").toEqual([]);
  }, { auto: true }],
});
export { expect };
