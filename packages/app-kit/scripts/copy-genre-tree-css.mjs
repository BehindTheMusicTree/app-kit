import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceCssPath = resolve(
  packageRoot,
  "node_modules/@behindthemusictree/genre-tree-view/dist/styles.css",
);
const destCssPath = resolve(packageRoot, "dist/genre-tree/styles.css");

if (!existsSync(sourceCssPath)) {
  throw new Error(
    `Cannot copy genre-tree-view styles: source file not found at ${sourceCssPath}. ` +
      `Ensure @behindthemusictree/genre-tree-view is installed before building.`,
  );
}

mkdirSync(dirname(destCssPath), { recursive: true });
copyFileSync(sourceCssPath, destCssPath);
