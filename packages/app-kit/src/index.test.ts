import { describe, it, expect } from "vitest";

import * as appKit from "./index";

describe("root barrel", () => {
  it("re-exports the package's public surface from every domain", () => {
    expect(appKit.useFetchWrapper).toBeTypeOf("function");
    expect(appKit.SessionProvider).toBeTypeOf("function");
    expect(appKit.useSession).toBeTypeOf("function");
    expect(appKit.PopupProvider).toBeTypeOf("function");
    expect(appKit.usePlayer).toBeTypeOf("function");
    expect(appKit.useListGenres).toBeTypeOf("function");
  });
});
