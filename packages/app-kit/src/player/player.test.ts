import { describe, it, expect } from "vitest";

import { PlayStates } from "./PlayStates";
import * as player from "./index";

describe("PlayStates", () => {
  it("exposes the expected enum members", () => {
    expect(PlayStates.PLAYING).toBe("PLAYING");
    expect(PlayStates.PAUSED).toBe("PAUSED");
    expect(PlayStates.STOPPED).toBe("STOPPED");
    expect(PlayStates.LOADING).toBe("LOADING");
  });
});

describe("player barrel", () => {
  it("re-exports PlayStates, PlayerContext, and MediaController", () => {
    expect(player.PlayStates).toBe(PlayStates);
    expect(player.PlayerProvider).toBeTypeOf("function");
    expect(player.usePlayer).toBeTypeOf("function");
    expect(player.AudioMediaController).toBeTypeOf("function");
    expect(player.YoutubeMediaController).toBeTypeOf("function");
  });
});
