import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const GENRE_TREE_STYLES_SPECIFIER = "@behindthemusictree/genre-tree-view/styles.css";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destCssPath = resolve(packageRoot, "dist/genre-tree/styles.css");
const localStylesPath = resolve(packageRoot, "src/genre-tree/track-position-play-pause.css");

try {
  createRequire(import.meta.url).resolve(GENRE_TREE_STYLES_SPECIFIER);
} catch (cause) {
  throw new Error(
    `Cannot re-export genre-tree-view styles: ${GENRE_TREE_STYLES_SPECIFIER} does not resolve. ` +
      `Ensure @behindthemusictree/genre-tree-view is installed before building.`,
    { cause },
  );
}

mkdirSync(dirname(destCssPath), { recursive: true });
const localStyles = readFileSync(localStylesPath, "utf8");
writeFileSync(destCssPath, `@import "${GENRE_TREE_STYLES_SPECIFIER}";\n\n${localStyles}\n`);
