import { test, expect, pop, rock, artistUuid } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

async function loadedCover(page: Page, name: string) {
  const cover = page.locator("[data-panel-cover]");
  await expect(cover.getByRole("img", { name, exact: true })).toBeVisible();
  await expect.poll(() => cover.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  return cover;
}

async function selectGenre(search: Locator, page: Page, name: string) {
  await search.fill(name);
  await page.getByRole("option").filter({ hasText: name }).click();
  await expect(search).toHaveValue(name);
}

test("genre cover scrolls beneath interactive search and clears across cached navigation", async ({ page, isMobile }) => {
  await page.goto(`/?genre=${pop}`);
  const search = page.getByRole("combobox", { name: /Search/ });
  await expect(search).toHaveValue("Picture Pop");
  const cover = await loadedCover(page, "Picture Pop");
  const panel = page.locator("[data-detail-panel]");
  const scroll = page.locator("[data-panel-cover-scroll]");
  if (isMobile) {
    const resize = panel.getByRole("button", { name: "Resize panel", exact: true });
    await resize.click();
    await expect(resize).toHaveAttribute("aria-expanded", "true");
  } else {
    await page.getByRole("button", { name: "Extend panel", exact: true }).click();
    await expect(panel).toHaveAttribute("data-expanded", "true");
  }
  const searchBefore = await search.boundingBox();
  const coverBefore = await cover.boundingBox();
  expect(searchBefore).not.toBeNull();
  expect(coverBefore).not.toBeNull();
  expect(searchBefore!.y).toBeGreaterThanOrEqual(coverBefore!.y);
  expect(searchBefore!.y + searchBefore!.height).toBeLessThan(coverBefore!.y + coverBefore!.height);
  await search.click();
  await expect(search).toBeFocused();
  await search.press("Escape");

  await panel.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Show less", exact: true })).toBeVisible();
  await scroll.evaluate((element) => { element.scrollTop = 150; });
  await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  const coverAfter = await cover.boundingBox();
  const searchAfter = await search.boundingBox();
  expect(coverAfter!.y).toBeLessThan(coverBefore!.y - 100);
  expect(Math.abs(searchAfter!.y - searchBefore!.y)).toBeLessThan(2);
  await scroll.evaluate((element) => { element.scrollTop = 0; });
  const credit = panel.getByRole("link", { name: "Fixture photographer" });
  await credit.scrollIntoViewIfNeeded();
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute("href", /commons.wikimedia.org/);
  await expect(panel.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
  await scroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const showLess = panel.getByRole("button", { name: "Show less", exact: true });
  await expect(showLess).toBeInViewport();
  await showLess.click();
  await expect(panel.getByRole("button", { name: "Show more", exact: true })).toBeVisible();

  if (isMobile) {
    const resize = panel.getByRole("button", { name: "Resize panel", exact: true });
    await resize.click();
    await expect(resize).toHaveAttribute("aria-expanded", "false");
  } else {
    await page.getByRole("button", { name: "Shrink panel", exact: true }).click();
    await expect(panel).toHaveAttribute("data-expanded", "false");
  }
  await selectGenre(search, page, "Imageless Rock");
  await expect(page).toHaveURL(new RegExp(rock));
  await expect(cover).toHaveCount(0);
  await expect(credit).toHaveCount(0);
  await expect(panel.getByText(/Imageless Rock summary/)).toBeVisible();
  await selectGenre(search, page, "Picture Pop");
  await loadedCover(page, "Picture Pop");
  await selectGenre(search, page, "Imageless Rock");
  await expect(cover).toHaveCount(0);
  await expect(credit).toHaveCount(0);
});

test("artist uses the shared cover and keeps its photo credit reachable", async ({ page, isMobile }) => {
  await page.goto(`/?artist=${artistUuid}`);
  const cover = await loadedCover(page, "Cover Artist");
  const search = page.getByRole("combobox", { name: /Search/ });
  await expect(search).toHaveValue("Cover Artist");
  if (isMobile) {
    const resize = page.getByRole("button", { name: "Resize panel", exact: true });
    await resize.click();
    await expect(resize).toHaveAttribute("aria-expanded", "true");
  }
  const box = await cover.boundingBox();
  const searchBox = await search.boundingBox();
  expect(searchBox!.y).toBeGreaterThanOrEqual(box!.y);
  expect(searchBox!.y + searchBox!.height).toBeLessThan(box!.y + box!.height);
  const credit = page.getByRole("link", { name: "Fixture photographer" });
  await credit.scrollIntoViewIfNeeded();
  await expect(credit).toBeVisible();
  await expect(page.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
});
