import { expect, test } from "@playwright/test";
import {
  CriteriaOverviewSchema,
  ReferenceGenreDetailedSchema,
  ReferenceGenrePlaylistSchema,
} from "@behindthemusictree/app-kit/genre-tree";

const genre = { uuid: "00000000-0000-4000-8000-000000000001", name: "Jazz" };
const playlist = { uuid: "00000000-0000-4000-8000-000000000002", name: "Jazz" };
const counts = { genreOnlyTracksCount: 1, genreAndSubgenresTracksCount: { all: 1 } };
const tree = ReferenceGenrePlaylistSchema.array().parse([{
  ...playlist, ...counts, criteria: genre, parent: null, root: playlist,
  catalogue: counts, tracksCount: 1, createdOn: "2026-01-01T00:00:00Z",
  updatedOn: null, isUnacceptedRoot: false,
}]);
const detail = ReferenceGenreDetailedSchema.parse({
  ...genre, summary: "Jazz summary.", parent: null, root: genre,
  children: [], ascendants: [], catalogue: counts,
  criteriaPlaylist: { ...playlist, ...counts }, essentialSongs: [],
  tracksCount: 1, updatedOn: null,
});
const overview = CriteriaOverviewSchema.parse({
  ...genre, summary: "Jazz summary.", description: null, summarySourceUrl: null,
});

for (const width of [390, 639, 640, 767]) {
  test(`search and account keep the sheet handle clickable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const unexpectedRequests: string[] = [];
    await page.route("**/api/grow-prototype-proxy/**", async (route) => {
      const path = new URL(route.request().url()).pathname
        .replace("/api/grow-prototype-proxy", "").replace(/\/$/, "");
      const responses: Record<string, unknown> = {
        "/genre-playlists/tree": tree,
        [`/genres/${genre.uuid}`]: detail,
        [`/genres/${genre.uuid}/overview`]: overview,
        [`/genres/${genre.uuid}/history`]: [],
        "/playback/context": { country: "FR" },
        "/library/songs": {
          overallTotal: 0, next: null, previous: null, results: [],
          page: 1, pageSize: 20, totalPages: 0,
        },
      };
      if (!(path in responses)) {
        unexpectedRequests.push(path);
        await route.abort();
        return;
      }
      await route.fulfill({ json: responses[path] });
    });
    await page.goto(`/?genre=${genre.uuid}`);
    const search = page.getByRole("combobox");
    const account = page.getByRole("button", { name: "Account", exact: true });
    const handle = page.getByRole("button", { name: "Resize panel", exact: true });
    await expect(search).toBeVisible();
    await expect(account).toBeVisible();
    await expect(handle).toHaveAttribute("aria-expanded", "false");
    await handle.click();
    await expect(handle).toHaveAttribute("aria-expanded", "true");
    // Trial clicks run browser hit testing without changing the expanded sheet.
    await search.click({ trial: true });
    await account.click({ trial: true });
    await handle.click();
    await expect(handle).toHaveAttribute("aria-expanded", "false");
    await account.click();
    await expect(page.getByText("Demo account", { exact: true })).toBeVisible();
    expect(unexpectedRequests).toEqual([]);
  });
}
