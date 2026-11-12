import type { ReactNode } from "react";
import { FieldList } from "@behindthemusictree/ui";
import type { ArtistDetailed, ArtistOrigin, RenderPlaceLink } from "@behindthemusictree/app-kit/genre-tree";
import ArtistLinks, { artistLinks } from "./ArtistLinks";
import { formatYears } from "./formatYears";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function originLabel(artist: ArtistDetailed, origin: ArtistOrigin): string {
  if (origin.source === "area") return "From";
  if (artist.type === "person") return "Born in";
  if (artist.type === "group") return "Formed in";
  return "From";
}

function OriginValue({
  origin,
  country,
  renderPlaceLink,
}: {
  origin: ArtistOrigin;
  country: string | undefined;
  renderPlaceLink?: RenderPlaceLink;
}) {
  const place =
    renderPlaceLink && origin.regionId !== null ? renderPlaceLink({ ...origin, regionId: origin.regionId }) : origin.name;
  return (
    <>
      {place}
      {country && origin.kind !== "country" && `, ${country}`}
    </>
  );
}

export default function ArtistHeader({
  artist,
  renderPlaceLink,
}: {
  artist: ArtistDetailed;
  renderPlaceLink?: RenderPlaceLink;
}) {
  const fields: { label: string; value: ReactNode }[] = [];
  if (artist.type) fields.push({ label: "Type", value: artist.type.charAt(0).toUpperCase() + artist.type.slice(1) });
  const country = artist.country ? countryNames.of(artist.country) : undefined;
  if (artist.origin) {
    fields.push({
      label: originLabel(artist, artist.origin),
      value: <OriginValue origin={artist.origin} country={country} renderPlaceLink={renderPlaceLink} />,
    });
  }
  if (country && !artist.origin) fields.push({ label: "Country", value: country });
  const years = formatYears(artist.beginYear, artist.endYear, artist.ended);
  if (years) fields.push({ label: "Active", value: years });
  const links = artistLinks(artist);
  if (links.length > 0) fields.push({ label: "Links", value: <ArtistLinks links={links} /> });

  if (fields.length === 0) return null;
  return <FieldList items={fields} />;
}
