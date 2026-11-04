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
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("turns browser autocomplete off", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("autocomplete", "off");
  });

  it("shows matching results as the user types", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "hou" } });

    expect(screen.getByText("Deep House")).toBeInTheDocument();
    expect(screen.queryByText("Ambient")).not.toBeInTheDocument();
  });

  it("flags umbrella results with a badge", () => {
    const umbrella = { ...makeGenrePlaylist("Techno"), isUmbrella: true };
    render(<GenreSearch genrePlaylists={[umbrella, makeGenrePlaylist("Technoid")]} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "techno" } });

    expect(screen.getAllByText("umbrella")).toHaveLength(1);
  });

  it("calls onSelect with the matching genre playlist when a result is clicked", () => {
    const onSelect = vi.fn();
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "amb" } });
    fireEvent.mouseDown(screen.getByText("Ambient"));

    expect(onSelect).toHaveBeenCalledWith(genrePlaylists[1]);
  });

  it("clears the query and results after a selection", () => {
    render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "amb" } });
    fireEvent.mouseDown(screen.getByText("Ambient"));

    expect(screen.getByRole("combobox")).toHaveValue("");
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
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows results when typing over the selected name", () => {
    render(
      <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} selectedName="Ambient" onClear={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Search a genre"), { target: { value: "hou" } });

    expect(screen.getByRole("option", { name: "Deep House" })).toBeInTheDocument();
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

  describe("extraGroups", () => {
    const extra = (onSelect = vi.fn()) => [{
      key: "artists",
      label: "Artists",
      items: [{ key: "a", content: "Taylor Swift", onSelect }],
      status: "1 artist found",
    }];

    it("groups genres and extra results under headings", () => {
      render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} extraGroups={extra()} />);

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "amb" } });

      expect(screen.getByText("Genres")).toBeInTheDocument();
      expect(screen.getByText("Artists")).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Taylor Swift" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("1 artist found");
    });

    it("labels the input Search with extras and Search a genre without", () => {
      const { unmount } = render(
        <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} extraGroups={extra()} />,
      );
      expect(screen.getByRole("combobox", { name: "Search" })).toHaveAttribute("placeholder", "Search…");
      unmount();

      render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);
      expect(screen.getByRole("combobox", { name: "Search a genre" })).toHaveAttribute("placeholder", "Search a genre…");
    });

    it("shows the spinner and marks the input busy while extra results load", () => {
      const { container, rerender } = render(
        <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} extraGroups={[{ ...extra()[0], loading: true }]} />,
      );
      const slot = () => container.querySelector("[data-loading]");

      expect(slot()).toHaveAttribute("data-loading", "false");

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "amb" } });
      expect(slot()).toHaveAttribute("data-loading", "true");
      expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");

      rerender(
        <GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} extraGroups={[{ ...extra()[0], loading: false }]} />,
      );
      expect(slot()).toHaveAttribute("data-loading", "false");
      expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "false");
    });

    it("shows no headings without extra results", () => {
      render(<GenreSearch genrePlaylists={genrePlaylists} onSelect={vi.fn()} />);

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "amb" } });

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
          extraGroups={extra(onSelect)}
        />,
      );

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "tay" } });
      expect(onQueryChange).toHaveBeenLastCalledWith("tay");
      fireEvent.mouseDown(screen.getByRole("option", { name: "Taylor Swift" }));

      expect(onSelect).toHaveBeenCalledOnce();
      expect(onQueryChange).toHaveBeenLastCalledWith("");
      expect(screen.getByRole("combobox")).toHaveValue("");
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
