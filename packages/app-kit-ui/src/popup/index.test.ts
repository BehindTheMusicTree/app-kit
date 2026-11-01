import { describe, it, expect } from "vitest";

import * as popup from "./index";

describe("popup barrel", () => {
  it("re-exports the styled popup surface", () => {
    expect(popup.PopupTitle).toBeTypeOf("function");
    expect(popup.PopupButtons).toBeTypeOf("function");
    expect(popup.BasePopup).toBeTypeOf("function");
    expect(popup.TrackUploadPopup).toBeTypeOf("function");
    expect(popup.AuthErrorPopup).toBeTypeOf("function");
    expect(popup.InternalErrorPopup).toBeTypeOf("function");
    expect(popup.NetworkErrorPopup).toBeTypeOf("function");
    expect(popup.AuthPopup).toBeTypeOf("function");
    expect(popup.SpotifyAuthErrorPopup).toBeTypeOf("function");
  });
});
