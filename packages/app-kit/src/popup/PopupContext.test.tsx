import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PopupProvider, usePopup } from "./PopupContext";

function Consumer({ onRender }: { onRender: (ctx: ReturnType<typeof usePopup>) => void }) {
  const ctx = usePopup();
  onRender(ctx);
  return null;
}

function Harness({ onRender }: { onRender: (ctx: ReturnType<typeof usePopup>) => void }) {
  const [count, setCount] = useState(0);
  return (
    <PopupProvider>
      <button onClick={() => setCount((c) => c + 1)}>increment {count}</button>
      <Consumer onRender={onRender} />
    </PopupProvider>
  );
}

describe("PopupProvider", () => {
  it("keeps showPopup, hidePopup, and the context value referentially stable across unrelated re-renders", () => {
    const renders: ReturnType<typeof usePopup>[] = [];
    render(<Harness onRender={(ctx) => renders.push(ctx)} />);

    expect(renders).toHaveLength(1);
    const first = renders[0];

    fireEvent.click(screen.getByText(/increment/));

    expect(renders).toHaveLength(2);
    const second = renders[1];

    expect(second).toBe(first);
    expect(second.showPopup).toBe(first.showPopup);
    expect(second.hidePopup).toBe(first.hidePopup);
  });

  it("shows and hides popup content", () => {
    const renders: ReturnType<typeof usePopup>[] = [];
    render(
      <PopupProvider>
        <Consumer onRender={(ctx) => renders.push(ctx)} />
      </PopupProvider>,
    );

    expect(renders[renders.length - 1].activePopup).toBeNull();

    act(() => {
      renders[renders.length - 1].showPopup(<div>hello</div>);
    });
    expect(renders[renders.length - 1].activePopup).not.toBeNull();

    act(() => {
      renders[renders.length - 1].hidePopup();
    });
    expect(renders[renders.length - 1].activePopup).toBeNull();
  });

  it("hidePopup with onlyIfType only hides a popup of the matching type", () => {
    const renders: ReturnType<typeof usePopup>[] = [];
    render(
      <PopupProvider>
        <Consumer onRender={(ctx) => renders.push(ctx)} />
      </PopupProvider>,
    );

    act(() => {
      renders[renders.length - 1].showPopup(<div>hello</div>, "auth");
    });

    act(() => {
      renders[renders.length - 1].hidePopup({ onlyIfType: "other" });
    });
    expect(renders[renders.length - 1].activePopup).not.toBeNull();

    act(() => {
      renders[renders.length - 1].hidePopup({ onlyIfType: "auth" });
    });
    expect(renders[renders.length - 1].activePopup).toBeNull();
  });

  it("usePopup throws when used outside a PopupProvider", () => {
    function BareConsumer() {
      usePopup();
      return null;
    }

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BareConsumer />)).toThrow("usePopup must be used within a PopupProvider");
    consoleError.mockRestore();
  });
});
