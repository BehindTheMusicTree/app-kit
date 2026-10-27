import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import type { CriteriaPlaylistSimple } from "@behindthemusictree/app-kit/genre-tree";

const { useUpdateGenreMock, mutateMock } = vi.hoisted(() => ({ useUpdateGenreMock: vi.fn(), mutateMock: vi.fn() }));

vi.mock("@behindthemusictree/app-kit/genre-tree", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@behindthemusictree/app-kit/genre-tree")>()),
  useUpdateGenre: (...args: unknown[]) => useUpdateGenreMock(...args),
}));

import ChangeParentPopup from "./ChangeParentPopup";

const makeGenre = (uuid: string, name: string, parent?: { uuid: string; name: string }) =>
  ({ uuid, name, parent: parent ?? null, root: { uuid: "root" }, criteria: { uuid: `c-${uuid}` } }) as unknown as CriteriaPlaylistSimple;

const rock = makeGenre("rock", "Rock");
const jazz = makeGenre("jazz", "Jazz", { uuid: "rock", name: "Rock" });
const blues = makeGenre("blues", "Blues");
const soul = makeGenre("soul", "Soul");
const getBackendBaseUrl = () => "https://b.example.com";

const mockMutation = (overrides: Partial<{ isPending: boolean; formErrors: { field: string; message: string }[] }> = {}) =>
  useUpdateGenreMock.mockReturnValue({ mutate: mutateMock, isPending: false, formErrors: [], ...overrides });

const renderPopup = (overrides: Partial<React.ComponentProps<typeof ChangeParentPopup>> = {}) => {
  const onClose = vi.fn();
  render(
    <ChangeParentPopup
      genrePlaylist={jazz}
      genrePlaylists={[rock, jazz, blues, soul]}
      scope="reference"
      getBackendBaseUrl={getBackendBaseUrl}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onClose };
};

describe("ChangeParentPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation();
  });

  it("shows the current parent", () => {
    renderPopup();
    expect(screen.getByText("Current parent: Rock")).toBeInTheDocument();
  });

  it("shows none when the genre has no parent", () => {
    renderPopup({ genrePlaylist: rock });
    expect(screen.getByText("Current parent: none")).toBeInTheDocument();
  });

  it("closes on Escape and Cancel, ignoring other keys", () => {
    const { onClose } = renderPopup();

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("offers only valid parents in the search", () => {
    renderPopup();

    fireEvent.change(screen.getByPlaceholderText("Search a new parent…"), { target: { value: "o" } });
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByRole("button", { name: "Soul" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Rock" })).not.toBeInTheDocument();
  });

  it("moves the genre under the picked parent and closes on success", () => {
    const { onClose } = renderPopup();

    fireEvent.change(screen.getByPlaceholderText("Search a new parent…"), { target: { value: "Bl" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Blues" }));

    expect(useUpdateGenreMock).toHaveBeenCalledWith("reference", getBackendBaseUrl);
    expect(mutateMock).toHaveBeenCalledWith({ uuid: "jazz", data: { parent: "blues" } }, { onSuccess: onClose });
  });

  it("marks the search busy while the update is pending", () => {
    mockMutation({ isPending: true });
    renderPopup();
    expect(screen.getByRole("dialog").querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("shows the update's form errors", () => {
    mockMutation({ formErrors: [{ field: "parent", message: "Invalid parent" }] });
    renderPopup();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid parent");
  });
});
