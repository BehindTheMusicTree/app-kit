import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import GenreDetailPanel from "./GenreDetailPanel";
import { CriteriaDetailed } from "./schemas/criteria/detailed";

function buildCriteria(overrides: Partial<CriteriaDetailed> = {}): CriteriaDetailed {
  return {
    uuid: "11111111-1111-1111-1111-111111111111",
    name: "Deep House",
    parent: null,
    ascendants: [],
    descendants: [],
    root: {
      uuid: "22222222-2222-2222-2222-222222222222",
      name: "Electronic",
      side: null,
    } as CriteriaDetailed["root"],
    children: [],
    criteriaPlaylist: {
      uuid: "33333333-3333-3333-3333-333333333333",
      name: "Deep House",
      tracksCount: 0,
    } as CriteriaDetailed["criteriaPlaylist"],
    tracks: [],
    essentialTracks: [],
    tracksCount: 0,
    tracksArchivedCount: 0,
    updatedOn: null,
    ...overrides,
  };
}

describe("GenreDetailPanel", () => {
  it("shows a loading state and no data", () => {
    render(<GenreDetailPanel criteria={null} isLoading={true} onClose={vi.fn()} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.getByText("Loading genre details…")).toBeInTheDocument();
  });

  it("shows a no-details state when not loading and there is no criteria", () => {
    render(<GenreDetailPanel criteria={null} isLoading={false} onClose={vi.fn()} />);

    expect(screen.getByText("No details available.")).toBeInTheDocument();
  });

  it("renders track count, children count, and essential tracks", () => {
    const criteria = buildCriteria({
      tracksCount: 12,
      tracksArchivedCount: 3,
      children: [
        { uuid: "44444444-4444-4444-4444-444444444444", name: "Sub Genre", side: null } as CriteriaDetailed["children"][number],
      ],
      essentialTracks: [
        { uuid: "55555555-5555-5555-5555-555555555555", title: "Track One", artists: null },
        { uuid: "66666666-6666-6666-6666-666666666666", title: "Track Two", artists: null },
      ],
    });

    render(<GenreDetailPanel criteria={criteria} isLoading={false} onClose={vi.fn()} />);

    expect(screen.getByText("Deep House")).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/3 archived/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Track One")).toBeInTheDocument();
    expect(screen.getByText("Track Two")).toBeInTheDocument();
  });

  it("omits the essential tracks section when there are none", () => {
    const criteria = buildCriteria({ essentialTracks: [] });

    render(<GenreDetailPanel criteria={criteria} isLoading={false} onClose={vi.fn()} />);

    expect(screen.queryByText("Essential tracks")).not.toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    const criteria = buildCriteria();

    render(<GenreDetailPanel criteria={criteria} isLoading={false} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
