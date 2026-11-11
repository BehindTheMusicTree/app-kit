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
  playableTracksCount: 0,
  image: null,
  origin: null,
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

  describe("origin", () => {
    const origin = {
      name: "Liverpool",
      kind: "City",
      source: "begin_area" as const,
      wikidataId: "Q24826",
      longitude: -2.98,
      latitude: 53.41,
      regionId: "r1",
    };

    it.each([
      ["person", "begin_area", "Born in"],
      ["group", "begin_area", "Formed in"],
      ["orchestra", "begin_area", "From"],
      ["group", "area", "From"],
    ] as const)("labels a %s origin from %s as %s", (type, source, label) => {
      render(<ArtistHeader artist={{ ...EMPTY, type, country: "GB", origin: { ...origin, source } }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText("Liverpool, United Kingdom")).toBeInTheDocument();
      expect(screen.queryByText("Country")).not.toBeInTheDocument();
    });

    it("renders the place through renderPlaceLink when the origin has a region", () => {
      render(
        <ArtistHeader
          artist={{ ...EMPTY, type: "person", country: "GB", origin }}
          renderPlaceLink={(place) => <a href={`/map?region=${place.regionId}`}>{place.name}</a>}
        />,
      );
      expect(screen.getByRole("link", { name: "Liverpool" })).toHaveAttribute("href", "/map?region=r1");
    });

    it("falls back to text when the origin has no region", () => {
      render(
        <ArtistHeader
          artist={{ ...EMPTY, type: "person", origin: { ...origin, regionId: null } }}
          renderPlaceLink={(place) => <a href={`/map?region=${place.regionId}`}>{place.name}</a>}
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("Liverpool")).toBeInTheDocument();
    });

    it("does not repeat the country when the origin is the country", () => {
      render(<ArtistHeader artist={{ ...EMPTY, country: "GB", origin: { ...origin, name: "United Kingdom", kind: "Country" } }} />);
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    });
  });
});
