"use client";

import { Fragment, ReactNode } from "react";

import { ArtistMinimum } from "./schemas/artist-minimum";

/** Renders one artist name as a link — typically the consumer's router `Link`, so navigating keeps playback alive. */
export type RenderArtistLink = (artist: ArtistMinimum) => ReactNode;

export function ArtistNames({
  artists,
  renderArtistLink,
}: {
  artists: ArtistMinimum[];
  renderArtistLink?: RenderArtistLink;
}) {
  if (!renderArtistLink) return <>{artists.map((artist) => artist.name).join(", ")}</>;
  return (
    <>
      {artists.map((artist, index) => (
        <Fragment key={artist.uuid}>
          {index > 0 && ", "}
          {renderArtistLink(artist)}
        </Fragment>
      ))}
    </>
  );
}
