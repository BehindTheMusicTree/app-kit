import { describe, it, expect } from "vitest";

import * as auth from "./index";

describe("auth barrel", () => {
  it("re-exports the package's public auth surface", () => {
    expect(auth.getSpotifyRequiredCached).toBeTypeOf("function");
    expect(auth.setSpotifyRequiredCached).toBeTypeOf("function");
    expect(auth.clearSpotifyRequiredCached).toBeTypeOf("function");
    expect(auth.SessionProvider).toBeTypeOf("function");
    expect(auth.useSession).toBeTypeOf("function");
    expect(auth.SPOTIFY_EXCHANGE_CONFIG).toBeDefined();
    expect(auth.GOOGLE_EXCHANGE_CONFIG).toBeDefined();
    expect(auth.exchangeCodeWithBackend).toBeTypeOf("function");
    expect(auth.resolveRedirectUri).toBeTypeOf("function");
    expect(auth.storeRedirectUrl).toBeTypeOf("function");
    expect(auth.clearStoredRedirectUrl).toBeTypeOf("function");
    expect(auth.createLogout).toBeTypeOf("function");
    expect(auth.useLogout).toBeTypeOf("function");
    expect(auth.AuthCallbackHandler).toBeTypeOf("function");
  });
});
