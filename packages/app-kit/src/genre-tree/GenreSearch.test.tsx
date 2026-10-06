import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GenreSearch from "./GenreSearch";
import { CriteriaPlaylistSimple } from "./schemas/criteria-playlist/simple";

const makeGenrePlaylist = (name: string): CriteriaPlaylistSimple => ({
  uuid: name,
  name,
  criteria: null,
  parent: null,
  root: { uuid: "root", name: "root" },
  tracksCount: 0,
  createdOn: "2026-01-01T00:00:00Z",
  updatedOn: null,
  isUnacceptedRoot: false,
});

describe("GenreSearch", () => {
  const genrePlaylists = [makeGenrePlaylist("Deep House"), makeGenrePlaylist("Ambient")];

  it("renders no results before typing", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows matching results as the user types", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hou" } });

    expect(screen.getByText("Deep House")).toBeInTheDocument();
    expect(screen.queryByText("Ambient")).not.toBeInTheDocument();
  });

  it("calls onSelect with the matching genre playlist when a result is clicked", () => {
    const onSelect = vi.fn();
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "amb" } });
    fireEvent.click(screen.getByText("Ambient"));

    expect(onSelect).toHaveBeenCalledWith(genrePlaylists[1]);
  });

  it("clears the query and results after a selection", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "amb" } });
    fireEvent.click(screen.getByText("Ambient"));

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByText("Ambient")).not.toBeInTheDocument();
  });

  it("fills the input with the selected genre's name without showing results", () => {
    const { rerender } = render(
      <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} selectedName={null} onClear={vi.fn()} />,
    );

    rerender(
      <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} selectedName="Ambient" onClear={vi.fn()} />,
    );

    expect(screen.getByLabelText("Search a genre")).toHaveValue("Ambient");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows results when typing over the selected name", () => {
    render(
      <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} selectedName="Ambient" onClear={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Search a genre"), { target: { value: "hou" } });

    expect(screen.getByRole("button", { name: "Deep House" })).toBeInTheDocument();
  });

  it("empties the input and calls onClear when ✕ is clicked", () => {
    const onClear = vi.fn();
    render(
      <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} selectedName="Ambient" onClear={onClear} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Search a genre")).toHaveValue("");
  });
});
