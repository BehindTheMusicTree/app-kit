import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [
  "@behindthemusictree/ui",
  "@behindthemusictree/app-kit-ui",
  "@behindthemusictree/genre-tree-view",
  "lucide-react",
  "react-icons",
  "clsx",
  "tailwind-merge",
];

const importPattern = /(?:from|import|vi\.mock\()\s*\(?\s*["']([^"']+)["']/g;

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

const violations = walk("src").flatMap((file) =>
  [...readFileSync(file, "utf8").matchAll(importPattern)]
    .map((match) => match[1])
    .filter((specifier) => FORBIDDEN.some((name) => specifier === name || specifier.startsWith(`${name}/`)))
    .map((specifier) => `${file}: ${specifier}`),
);

if (violations.length > 0) {
  console.error(`app-kit is headless; styled or UI imports are not allowed:\n${violations.join("\n")}`);
  process.exit(1);
}
