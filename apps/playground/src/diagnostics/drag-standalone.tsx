import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GenreTreeWheelRadialPopCore } from "@behindthemusictree/genre-tree-view";
import { ReferenceGenrePlaylistSchema } from "../../../../packages/app-kit/src/genre-tree/schemas/reference-genre";
import { toTreeNodes } from "../../../../packages/app-kit-ui/src/genre-tree/playlist-tree/toTreeNodes";
import "@behindthemusictree/brand/tokens/theme.css";
import "@behindthemusictree/genre-tree-view/styles.css";

// The diagnostic runner supplies the same API payload to the full playground.
const response = await fetch("/__drag-fixture.json");
if (!response.ok) throw new Error(`Missing diagnostic fixture: ${response.status}`);
const playlists = ReferenceGenrePlaylistSchema.array().parse(await response.json());
const nodes = toTreeNodes(playlists, "songs");
const root = document.getElementById("root");
if (!root) throw new Error("Missing diagnostic root");

createRoot(root).render(
  <StrictMode>
    <GenreTreeWheelRadialPopCore nodes={nodes} allowWheelRotation={false} busy={false} />
  </StrictMode>,
);
