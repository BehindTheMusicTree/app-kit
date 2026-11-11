import type { ArtistImage } from "@behindthemusictree/app-kit/genre-tree";
import CommonsPhoto from "../CommonsPhoto";

export default function ArtistPhoto({ image, name }: { image: ArtistImage; name: string }) {
  return <CommonsPhoto image={image} alt={name} />;
}
