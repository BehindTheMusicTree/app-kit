import { describe, it, expect } from "vitest";

import * as popup from "./index";

describe("popup barrel", () => {
  it("re-exports the package's public popup surface", () => {
    expect(popup.PopupProvider).toBeTypeOf("function");
    expect(popup.usePopup).toBeTypeOf("function");
    expect(popup.useConnectivityErrorPopup).toBeTypeOf("function");
    expect(popup.useTrackUpload).toBeTypeOf("function");
  });
});
