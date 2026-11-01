import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import ArtistMembers from "./ArtistMembers";

const renderArtistLink = ({ uuid, name }: { uuid: string; name: string }) => <a href={`/artists/${uuid}`}>{name}</a>;

const membership = (name: string, overrides: Record<string, unknown> = {}) => ({
  artist: { uuid: crypto.randomUUID(), name },
  beginYear: 1994,
  endYear: null,
  ended: false,
  roles: [],
  ...overrides,
});

describe("ArtistMembers", () => {
  afterEach(cleanup);

  it("splits current and past members, with periods, roles, and artist links", () => {
    const current = membership("Alice", { roles: ["vocals"] });
    render(
      <ArtistMembers
        title="Members"
        renderArtistLink={renderArtistLink}
        memberships={[current, membership("Bob", { endYear: 2008, ended: true }), membership("Carol", { ended: true })]}
      />,
    );

    const currentList = within(screen.getByRole("heading", { name: "Current" }).parentElement!);
    expect(currentList.getByRole("link", { name: "Alice" })).toHaveAttribute("href", `/artists/${current.artist.uuid}`);
    expect(currentList.getByText(/1994–present · vocals/)).toBeInTheDocument();

    const pastList = within(screen.getByRole("heading", { name: "Past" }).parentElement!);
    expect(pastList.getByText(/1994–2008/)).toBeInTheDocument();
    expect(pastList.getByRole("link", { name: "Carol" })).toBeInTheDocument();
    expect(pastList.queryByRole("link", { name: "Alice" })).not.toBeInTheDocument();
  });

  it("shows only the name when neither period nor roles are known", () => {
    render(
      <ArtistMembers
        title="Members"
        renderArtistLink={renderArtistLink}
        memberships={[membership("Dan", { beginYear: null })]}
      />,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent(/^Dan$/);
  });

  it("renders nothing without memberships", () => {
    render(<ArtistMembers title="Members" memberships={[]} renderArtistLink={renderArtistLink} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
