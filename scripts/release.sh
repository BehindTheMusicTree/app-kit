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

git checkout main
git merge --no-ff --no-edit "$RELEASE_BRANCH"
git tag -a "v$NEW_VERSION" -m "v$NEW_VERSION"

git checkout develop
git merge --no-ff --no-edit "$RELEASE_BRANCH"

git push origin main develop --follow-tags
git branch -d "$RELEASE_BRANCH"

echo ""
echo "Released v$NEW_VERSION ($OLD_VERSION -> $NEW_VERSION)"
echo "main and develop are both updated; publishing to GitHub Packages will start automatically."
