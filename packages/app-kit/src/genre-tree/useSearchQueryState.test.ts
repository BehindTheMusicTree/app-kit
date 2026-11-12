import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useSearchQueryState } from "./useSearchQueryState";

describe("useSearchQueryState", () => {
  it("starts from the selected name and is not typing", () => {
    const { result } = renderHook(() => useSearchQueryState({ selectedName: "Jazz" }));

    expect(result.current.query).toBe("Jazz");
    expect(result.current.isTyping).toBe(false);
    expect(result.current.canClear).toBe(true);
  });

  it("is typing once the query diverges, and refills when the selection changes", () => {
    const { result, rerender } = renderHook(({ name }) => useSearchQueryState({ selectedName: name }), {
      initialProps: { name: "Jazz" as string | null },
    });
    act(() => result.current.setQuery("Jaz"));
    expect(result.current.isTyping).toBe(true);

    rerender({ name: "Rock" });
    expect(result.current.query).toBe("Rock");
    expect(result.current.isTyping).toBe(false);
  });

  it("clears the query and calls onClear", () => {
    const onClear = vi.fn();
    const { result } = renderHook(() => useSearchQueryState({ onClear }));
    act(() => result.current.setQuery("ja"));
    expect(result.current.canClear).toBe(true);

    act(() => result.current.clear());

    expect(result.current.query).toBe("");
    expect(result.current.canClear).toBe(false);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("empties the query on a new pick but keeps it when re-picking the selection", () => {
    const { result } = renderHook(() => useSearchQueryState({ selectedName: "Jazz" }));
    act(() => result.current.setQuery("ja"));

    act(() => result.current.notifyPick("Rock"));
    expect(result.current.query).toBe("");

    act(() => result.current.setQuery("ja"));
    act(() => result.current.notifyPick("Jazz"));
    expect(result.current.query).toBe("Jazz");
  });
});
