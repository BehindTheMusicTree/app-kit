import { z } from "zod";

import { ArtistMinimumSchema } from "./artist-minimum";
import { CommonsImageSchema, type CommonsImage } from "./commons-image";
import { HttpUrlSchema } from "./http-url";

const ArtistMembershipSchema = z.object({
  artist: ArtistMinimumSchema,
  beginYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  ended: z.boolean(),
  roles: z.array(z.string()),
});

export const ARTIST_LINK_KINDS = [
  "official",
  "wikipedia",
  "wikidata",
  "spotify",
  "youtube",
  "bandcamp",
  "soundcloud",
  "discogs",
  "social",
] as const;

export const ArtistImageSchema = CommonsImageSchema;

export const ArtistDetailedSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  musicbrainzArtistId: z.string().uuid().nullable(),
  type: z.enum(["person", "group", "orchestra", "choir", "character", "other"]).nullable(),
  country: z.string().nullable(),
  beginYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  ended: z.boolean(),
  links: z.array(z.object({ kind: z.enum(ARTIST_LINK_KINDS), url: HttpUrlSchema })),
  members: z.array(ArtistMembershipSchema),
  memberOf: z.array(ArtistMembershipSchema),
  albums: z.array(
    z.object({
      uuid: z.string().uuid(),
      name: z.string(),
      year: z.string().nullable(),
      primaryType: z.string().nullable(),
      secondaryTypes: z.array(z.string()),
    }),
  ),
  tracksCount: z.number().int(),
  playableTracksCount: z.number().int(),
  image: ArtistImageSchema.nullable(),
});

export type ArtistImage = CommonsImage;
export type ArtistDetailed = z.infer<typeof ArtistDetailedSchema>;
export type ArtistMembership = ArtistDetailed["members"][number];
export type ArtistLink = ArtistDetailed["links"][number];
export type ArtistAlbum = ArtistDetailed["albums"][number];
