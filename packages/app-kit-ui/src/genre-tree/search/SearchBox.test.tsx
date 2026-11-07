import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import SearchBox from "./SearchBox";
import { searchStatus, type SearchGroup } from "./SearchGroup";

function Harness({ groups, onPicked, onClear }: { groups: SearchGroup[]; onPicked?: () => void; onClear?: () => void }) {
  const [value, setValue] = useState("");
  return <SearchBox label="Search" value={value} onValueChange={setValue} groups={groups} onPicked={onPicked} onClear={onClear} />;
}

describe("SearchBox", () => {
  it("lists every group's items and calls the picked item's onSelect", () => {
    const onPlace = vi.fn();
    const onPicked = vi.fn();
    const groups: SearchGroup[] = [
      { key: "places", label: "Places", items: [{ key: "br", content: "Brazil", onSelect: onPlace }] },
      { key: "songs", label: "Songs", items: [{ key: "s1", content: "Garota", onSelect: vi.fn() }] },
    ];
    render(<Harness groups={groups} onPicked={onPicked} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "br" } });
    expect(screen.getByRole("option", { name: "Garota" })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("option", { name: "Brazil" }));

    expect(onPlace).toHaveBeenCalledOnce();
    expect(onPicked).toHaveBeenCalledWith("places", "br");
  });

  it("joins the groups' statuses", () => {
    const groups: SearchGroup[] = [
      { key: "a", items: [], status: "No artists found" },
      { key: "b", items: [], status: "Search failed" },
    ];
    render(<Harness groups={groups} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zz" } });
    expect(screen.getByText("No artists found. Search failed")).toBeInTheDocument();
  });

  it("calls onClear from the clear button", () => {
    const onClear = vi.fn();
    render(<Harness groups={[]} onClear={onClear} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe("searchStatus", () => {
  it("reports failure, emptiness once settled, and nothing otherwise", () => {
    expect(searchStatus({ isError: true, settled: true }, 0, "songs")).toBe("Search failed");
    expect(searchStatus({ isError: false, settled: true }, 0, "songs")).toBe("No songs found");
    expect(searchStatus({ isError: false, settled: false }, 0, "songs")).toBe("");
    expect(searchStatus({ isError: false, settled: true }, 2, "songs")).toBe("");
  });
});
