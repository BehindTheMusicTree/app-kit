/**
 * Generic "subdomain + env -> base URL" builder, extracted from
 * `grow-the-music-tree-frontend`'s `src/lib/site-urls.ts`. That file hardcoded HTMT-specific
 * constants (`HTMT_API_SUBDOMAIN`, `NEXT_PUBLIC_HTMT_API_ROOT_SEGMENT`, `@behindthemusictree/brand`
 * imports); this version takes everything as parameters so any BehindTheMusicTree app (grow, hear,
 * future apps) can build its own `getBackendBaseUrl()`-style helper on top of it without this
 * package knowing about any particular app's env var names or subdomains.
 */

export interface BuildSubdomainBaseUrlParams {
  /** e.g. `HTMT_API_SUBDOMAIN` / `GTMT_API_SUBDOMAIN` from `@behindthemusictree/brand`. */
  subdomain: string;
  /** e.g. `ORG_DOMAIN` from `@behindthemusictree/brand`. */
  orgDomain: string;
  isProduction: boolean;
  /** Appended to `subdomain` off production. Defaults to `"-staging"`. */
  stagingSuffix?: string;
}

/** Builds `https://{subdomain}[-staging].{orgDomain}`. */
export function buildSubdomainBaseUrl({
  subdomain,
  orgDomain,
  isProduction,
  stagingSuffix = "-staging",
}: BuildSubdomainBaseUrlParams): string {
  if (!subdomain) throw new Error("subdomain is required");
  if (!orgDomain) throw new Error("orgDomain is required");
  const host = isProduction ? subdomain : `${subdomain}${stagingSuffix}`;
  return `https://${host}.${orgDomain}`;
}

export interface BuildBackendBaseUrlParams {
  apiSubdomain: string;
  orgDomain: string;
  /** Path segment appended after the origin, e.g. an API root segment env var's value. */
  apiRootSegment: string;
  isProduction: boolean;
  stagingSuffix?: string;
  /**
   * When set, short-circuits to this value instead of deriving from subdomain/env — mirrors
   * grow's local/remote dev override pattern (`NEXT_PUBLIC_BACKEND_BASE_URL` off Vercel).
   */
  overrideUrl?: string;
}

/** Builds `https://{apiSubdomain}[-staging].{orgDomain}/{apiRootSegment}/`. */
export function buildBackendBaseUrl(params: BuildBackendBaseUrlParams): string {
  if (params.overrideUrl) return params.overrideUrl;
  const { apiSubdomain, orgDomain, apiRootSegment, isProduction, stagingSuffix } = params;
  if (!apiRootSegment) throw new Error("apiRootSegment is required");
  const origin = buildSubdomainBaseUrl({ subdomain: apiSubdomain, orgDomain, isProduction, stagingSuffix });
  return `${origin}/${apiRootSegment.replace(/^\/+|\/+$/g, "")}/`;
}
