import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ArtistNames } from "./ArtistNames";
import type { ArtistMinimum } from "./schemas/artist-minimum";

const artists = [
  { uuid: "a1", name: "Alpha" },
  { uuid: "a2", name: "Beta" },
] as ArtistMinimum[];

describe("ArtistNames", () => {
  it("joins names as plain text without a renderer", () => {
    const { container } = render(<ArtistNames artists={artists} />);

    expect(container).toHaveTextContent("Alpha, Beta");
  });

  it("renders each artist through renderArtistLink, comma-separated", () => {
    const { container } = render(
      <ArtistNames artists={artists} renderArtistLink={(artist) => <a href={`/${artist.uuid}`}>{artist.name}</a>} />,
    );

    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute("href", "/a1");
    expect(screen.getByRole("link", { name: "Beta" })).toHaveAttribute("href", "/a2");
    expect(container).toHaveTextContent("Alpha, Beta");
  });
});
