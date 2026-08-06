#!/usr/bin/env node
/**
 * Pushes the NPM_TOKEN needed to install @behindthemusictree/* from GitHub Packages
 * to the Vercel project used for `apps/playground`.
 * Used by `.github/workflows/vercel-playground-env.yml`.
 *
 * Required env: VERCEL_TOKEN, VERCEL_PROJECT_ID, NPM_TOKEN
 * Optional: VERCEL_TEAM_ID (Vercel team scope; omit for personal projects)
 */
function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function requireNonEmpty(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    fail(`Error: ${name} is required for Vercel env sync.`);
  }
  return v;
}

const token = requireNonEmpty("VERCEL_TOKEN");
const projectId = requireNonEmpty("VERCEL_PROJECT_ID");
const npmToken = requireNonEmpty("NPM_TOKEN");
const teamId = process.env.VERCEL_TEAM_ID?.trim();

// Vercel rejects "sensitive" env vars targeting "development".
const targets = ["production", "preview"];

const url = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env`);
url.searchParams.set("upsert", "true");
if (teamId) {
  url.searchParams.set("teamId", teamId);
}

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    key: "NPM_TOKEN",
    value: npmToken,
    type: "sensitive",
    target: targets,
  }),
});

if (!res.ok) {
  const text = await res.text();
  fail(`Error: Vercel API failed for NPM_TOKEN (${res.status} ${res.statusText}): ${text}`);
}

process.stdout.write("Done. NPM_TOKEN synced to Vercel.\n");
