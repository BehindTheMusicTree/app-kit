import { describe, it, expect } from "vitest";
import { buildSubdomainBaseUrl, buildBackendBaseUrl } from "./site-urls";

describe("buildSubdomainBaseUrl", () => {
  it("builds the production host without a staging suffix", () => {
    expect(buildSubdomainBaseUrl({ subdomain: "api", orgDomain: "example.com", isProduction: true })).toBe(
      "https://api.example.com",
    );
  });

  it("builds the staging host with the default staging suffix", () => {
    expect(buildSubdomainBaseUrl({ subdomain: "api", orgDomain: "example.com", isProduction: false })).toBe(
      "https://api-staging.example.com",
    );
  });

  it("builds the staging host with a custom staging suffix", () => {
    expect(
      buildSubdomainBaseUrl({
        subdomain: "api",
        orgDomain: "example.com",
        isProduction: false,
        stagingSuffix: "-dev",
      }),
    ).toBe("https://api-dev.example.com");
  });

  it("throws when subdomain is missing", () => {
    expect(() => buildSubdomainBaseUrl({ subdomain: "", orgDomain: "example.com", isProduction: true })).toThrow(
      "subdomain is required",
    );
  });

  it("throws when orgDomain is missing", () => {
    expect(() => buildSubdomainBaseUrl({ subdomain: "api", orgDomain: "", isProduction: true })).toThrow(
      "orgDomain is required",
    );
  });
});

describe("buildBackendBaseUrl", () => {
  it("returns the override url when given, bypassing derivation", () => {
    expect(
      buildBackendBaseUrl({
        apiSubdomain: "api",
        orgDomain: "example.com",
        apiRootSegment: "v1",
        isProduction: true,
        overrideUrl: "https://override.example.com/",
      }),
    ).toBe("https://override.example.com/");
  });

  it("builds a production backend url and trims surrounding slashes from the segment", () => {
    expect(
      buildBackendBaseUrl({
        apiSubdomain: "api",
        orgDomain: "example.com",
        apiRootSegment: "/v1/",
        isProduction: true,
      }),
    ).toBe("https://api.example.com/v1/");
  });

  it("builds a staging backend url with a custom staging suffix", () => {
    expect(
      buildBackendBaseUrl({
        apiSubdomain: "api",
        orgDomain: "example.com",
        apiRootSegment: "v1",
        isProduction: false,
        stagingSuffix: "-dev",
      }),
    ).toBe("https://api-dev.example.com/v1/");
  });

  it("throws when apiRootSegment is missing", () => {
    expect(() =>
      buildBackendBaseUrl({ apiSubdomain: "api", orgDomain: "example.com", apiRootSegment: "", isProduction: true }),
    ).toThrow("apiRootSegment is required");
  });
});
