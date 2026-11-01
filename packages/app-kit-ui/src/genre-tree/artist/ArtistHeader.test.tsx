import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ArtistDetailed } from "@behindthemusictree/app-kit/genre-tree";
import ArtistHeader from "./ArtistHeader";

const EMPTY: ArtistDetailed = {
  uuid: "11111111-1111-1111-1111-111111111111",
  name: "Band",
  musicbrainzArtistId: null,
  type: null,
  country: null,
  beginYear: null,
  endYear: null,
  ended: false,
  links: [],
  members: [],
  memberOf: [],
  albums: [],
  tracksCount: 0,
  image: null,
};

describe("ArtistHeader", () => {
  afterEach(cleanup);

  it("renders nothing when no field is known", () => {
    const { container } = render(<ArtistHeader artist={EMPTY} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists type, country, active years and links", () => {
    render(
      <ArtistHeader
        artist={{
          ...EMPTY,
          musicbrainzArtistId: "22222222-2222-2222-2222-222222222222",
          type: "group",
          country: "GB",
          beginYear: 1994,
          endYear: null,
          ended: false,
          links: [
            { kind: "wikipedia", url: "https://en.wikipedia.org/wiki/Band" },
            { kind: "social", url: "https://www.instagram.com/band" },
            { kind: "social", url: "not a url" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("1994–present")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wikipedia" })).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Band");
    expect(screen.getByRole("link", { name: "instagram.com" })).toHaveAttribute("href", "https://www.instagram.com/band");
    expect(screen.getByRole("link", { name: "Social" })).toHaveAttribute("href", "not a url");
    expect(screen.getByRole("link", { name: "MusicBrainz" })).toHaveAttribute(
      "href",
      "https://musicbrainz.org/artist/22222222-2222-2222-2222-222222222222",
    );
  });

  it.each([
    [{ beginYear: null, endYear: null, ended: true }, "ended"],
    [{ beginYear: null, endYear: 2008, ended: true }, "?–2008"],
    [{ beginYear: 1994, endYear: null, ended: true }, "1994–?"],
    [{ beginYear: 1994, endYear: 2008, ended: true }, "1994–2008"],
  ])("formats active years %o as %s", (years, expected) => {
    render(<ArtistHeader artist={{ ...EMPTY, ...years }} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
