#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == -- ]]; then shift; fi
BUMP="${1:-}"
if [[ $# != 1 || ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo 'Usage: pnpm release -- <patch|minor|major>' >&2
  exit 1
fi
cd "$(git rev-parse --show-toplevel)"
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != release/* && "$BRANCH" != hotfix/* ]]; then
  echo 'Error: use a release branch from current develop, or a hotfix branch from main' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Error: working tree must be clean before release preparation' >&2
  exit 1
fi
node scripts/release-utils.cjs check "$BUMP"
(cd packages/app-kit && npm version "$BUMP" --no-git-tag-version --ignore-scripts > /dev/null)
NEW_VERSION=$(node -p "require('./packages/app-kit/package.json').version")
(cd packages/app-kit-ui && npm version "$NEW_VERSION" --no-git-tag-version --ignore-scripts > /dev/null)
node -e "const fs=require('node:fs');const p='packages/app-kit-ui/package.json';const pkg=JSON.parse(fs.readFileSync(p,'utf8'));pkg.peerDependencies['@behindthemusictree/app-kit']='^'+process.argv[1];fs.writeFileSync(p,JSON.stringify(pkg,null,2)+'\n');" "$NEW_VERSION"
pnpm install --lockfile-only
node scripts/release-utils.cjs prepare
printf 'Prepared release files. Review, commit and open a PR against main. CI creates the tag after merge; integrate main back into develop afterward.\n'
