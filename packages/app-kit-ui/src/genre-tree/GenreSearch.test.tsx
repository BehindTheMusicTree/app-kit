import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GenreSearch from "./GenreSearch";
import { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";
import { makeGenrePlaylistUuid } from "@behindthemusictree/app-kit/genre-tree/testing";

const makeGenrePlaylist = (name: string): CriteriaPlaylistSimple => ({
  uuid: makeGenrePlaylistUuid(name),
  name,
  criteria: null,
  parent: null,
  root: { uuid: makeGenrePlaylistUuid("root"), name: "root" },
  tracksCount: 0,
  viewsCount: 0,
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

  it("flags umbrella results with a badge", () => {
    const umbrella = { ...makeGenrePlaylist("Techno"), isUmbrella: true };
    render(<GenreSearch genrePlaylists={[umbrella, makeGenrePlaylist("Technoid")]} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "techno" } });

    expect(screen.getAllByText("umbrella")).toHaveLength(1);
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

  describe("extraResults", () => {
    const extra = (onSelect = vi.fn()) => ({
      label: "Artists",
      items: [{ key: "a", content: "Taylor Swift", onSelect }],
      status: "1 artist found",
    });

    it("groups genres and extra results under headings", () => {
      render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} extraResults={extra()} />);

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "amb" } });

      expect(screen.getByText("Genres")).toBeInTheDocument();
      expect(screen.getByText("Artists")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Taylor Swift" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("1 artist found");
    });

    it("labels the input Search with extras and Search a genre without", () => {
      const { unmount } = render(
        <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} extraResults={extra()} />,
      );
      expect(screen.getByRole("textbox", { name: "Search" })).toHaveAttribute("placeholder", "Search…");
      unmount();

      render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);
      expect(screen.getByRole("textbox", { name: "Search a genre" })).toHaveAttribute("placeholder", "Search a genre…");
    });

    it("shows no headings without extra results", () => {
      render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "amb" } });

      expect(screen.queryByText("Genres")).not.toBeInTheDocument();
    });

    it("reports typing, and clears the query when an extra result is picked", () => {
      const onQueryChange = vi.fn();
      const onSelect = vi.fn();
      render(
        <GenreSearch
          genrePlaylists={genrePlaylists}
          onSelect={vi.fn()}
          onQueryChange={onQueryChange}
          extraResults={extra(onSelect)}
        />,
      );

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "tay" } });
      expect(onQueryChange).toHaveBeenLastCalledWith("tay");
      fireEvent.click(screen.getByRole("button", { name: "Taylor Swift" }));

      expect(onSelect).toHaveBeenCalledOnce();
      expect(onQueryChange).toHaveBeenLastCalledWith("");
      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("does not report the query when the selected name refills the input", () => {
      const onQueryChange = vi.fn();
      const { rerender } = render(
        <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} onQueryChange={onQueryChange} />,
      );

      rerender(
        <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} onQueryChange={onQueryChange} selectedName="Ambient" />,
      );

      expect(onQueryChange).not.toHaveBeenCalled();
    });
  });
});
