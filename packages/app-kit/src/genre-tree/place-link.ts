import type { ReactNode } from "react";

import type { ArtistOrigin } from "./schemas/artist-detailed";

/** Renders an artist's origin place as a link to its map region — typically the consumer's router `Link`. Only called when the origin has a `regionId`. */
export type RenderPlaceLink = (origin: ArtistOrigin & { regionId: string }) => ReactNode;
