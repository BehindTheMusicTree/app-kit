import { describe, it, expect } from "vitest";

import * as popup from "./index";

describe("popup barrel", () => {
  it("re-exports the package's public popup surface", () => {
    expect(popup.PopupProvider).toBeTypeOf("function");
    expect(popup.usePopup).toBeTypeOf("function");
    expect(popup.PopupTitle).toBeTypeOf("function");
    expect(popup.PopupButtons).toBeTypeOf("function");
    expect(popup.BasePopup).toBeTypeOf("function");
    expect(popup.useConnectivityErrorPopup).toBeTypeOf("function");
    expect(popup.TrackUploadPopup).toBeTypeOf("function");
    expect(popup.AuthErrorPopup).toBeTypeOf("function");
    expect(popup.InternalErrorPopup).toBeTypeOf("function");
    expect(popup.NetworkErrorPopup).toBeTypeOf("function");
    expect(popup.AuthPopup).toBeTypeOf("function");
    expect(popup.SpotifyAuthErrorPopup).toBeTypeOf("function");
  });
});
