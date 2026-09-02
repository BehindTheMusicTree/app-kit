#!/usr/bin/env bash
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: must run from main (currently on '$BRANCH') — check out main after the release PR merges"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean — commit or stash changes first"
  exit 1
fi

git fetch origin main --tags
if [[ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]]; then
  echo "Error: local main is not in sync with origin/main — pull first"
  exit 1
fi

VERSION=$(node -p "require('./packages/app-kit/package.json').version")
TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1 || git ls-remote --tags origin "refs/tags/$TAG" | grep -q .; then
  echo "Error: tag $TAG already exists"
  exit 1
fi

git tag -a "$TAG" -m "$TAG"
git push origin "$TAG"

echo ""
echo "Tagged and pushed $TAG — the publish workflow will run and push to GitHub Packages."
echo "Don't forget to merge the release PR into develop if you haven't already."