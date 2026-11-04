import type { ReactNode } from "react";

/** Renders a song title as a link to the song's panel — typically the consumer's router `Link`. */
export type RenderSongLink = (song: { uuid: string; title: string }) => ReactNode;
