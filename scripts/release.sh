#!/usr/bin/env bash
set -euo pipefail

BUMP="${1:-}"

if [[ -z "$BUMP" ]]; then
  echo "Usage: pnpm run release -- <patch|minor|major>"
  exit 1
fi

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Error: bump type must be patch, minor, or major (got '$BUMP')"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "develop" ]]; then
  echo "Error: releases must be cut from develop (currently on '$BRANCH')"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean — commit or stash changes first"
  exit 1
fi

git fetch origin main develop
if [[ "$(git rev-parse develop)" != "$(git rev-parse origin/develop)" ]]; then
  echo "Error: local develop is not in sync with origin/develop — pull first"
  exit 1
fi

OLD_VERSION=$(node -p "require('./packages/app-kit/package.json').version")
(cd packages/app-kit && npm version "$BUMP" --no-git-tag-version > /dev/null)
NEW_VERSION=$(node -p "require('./packages/app-kit/package.json').version")
TODAY=$(date +%Y-%m-%d)

RELEASE_BRANCH="release/$NEW_VERSION"
git checkout -b "$RELEASE_BRANCH"

pnpm install --lockfile-only

node -e "
const fs = require('fs');
const v = process.argv[1];
const day = process.argv[2];
let s = fs.readFileSync('CHANGELOG.md', 'utf8');
const needle = /^## \\[Unreleased\\]$/gm;
let n = 0;
s = s.replace(needle, (m) => {
  n += 1;
  if (n === 1) return \`## [Unreleased]\\n\\n## [\${v}] - \${day}\`;
  return m;
});
fs.writeFileSync('CHANGELOG.md', s);
" "$NEW_VERSION" "$TODAY"

git add packages/app-kit/package.json pnpm-lock.yaml CHANGELOG.md
git commit -m "chore: release $NEW_VERSION"

git push -u origin "$RELEASE_BRANCH"

gh pr create --base main --head "$RELEASE_BRANCH" \
  --title "Release v$NEW_VERSION" \
  --body "Release v$NEW_VERSION ($OLD_VERSION -> $NEW_VERSION). After this merges, run \`pnpm run tag-release\` on \`main\` to tag and trigger the publish workflow, then merge the companion PR into \`develop\`."

gh pr create --base develop --head "$RELEASE_BRANCH" \
  --title "Release v$NEW_VERSION (merge back into develop)" \
  --body "Merges release/$NEW_VERSION back into develop alongside the main PR."

git checkout develop

echo ""
echo "Opened PRs for v$NEW_VERSION ($OLD_VERSION -> $NEW_VERSION) into main and develop."
echo "Once the main PR merges, run: pnpm run tag-release"
