import { describe, it, expect } from "vitest";

import * as auth from "./index";

describe("auth barrel", () => {
  it("re-exports AuthCallbackHandler", () => {
    expect(auth.AuthCallbackHandler).toBeTypeOf("function");
  });
});
