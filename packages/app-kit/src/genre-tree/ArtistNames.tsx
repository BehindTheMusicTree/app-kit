"use client";

import { Fragment } from "react";

import { ArtistMinimum } from "./schemas/artist-minimum";

export type GetArtistHref = (artist: ArtistMinimum) => string;

export function ArtistNames({ artists, getArtistHref }: { artists: ArtistMinimum[]; getArtistHref?: GetArtistHref }) {
  if (!getArtistHref) return <>{artists.map((artist) => artist.name).join(", ")}</>;
  return (
    <>
      {artists.map((artist, index) => (
        <Fragment key={artist.uuid}>
          {index > 0 && ", "}
          <a href={getArtistHref(artist)} className="hover:underline">
            {artist.name}
          </a>
        </Fragment>
      ))}
    </>
  );
}
