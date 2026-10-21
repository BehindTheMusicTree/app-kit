import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import TrackUploadPopup from "./TrackUploadPopup";

type Settle = { resolve: (value: unknown) => void; reject: (reason: Error) => void };

function makeFile(name: string, content = "x") {
  return new File([content], name, { type: "audio/mpeg" });
}

describe("TrackUploadPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pending/uploading status for files and starts uploading automatically", async () => {
    const onProcessFile = vi.fn(() => new Promise(() => {}));
    render(
      <TrackUploadPopup
        files={[makeFile("a.mp3"), makeFile("b.mp3")]}
        onProcessFile={onProcessFile}
        uploadTimeoutMs={100000}
      />,
    );

    await waitFor(() => expect(screen.getByText("Uploading...")).toBeInTheDocument());
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText(/Upload Tracks \(0\/2\)/)).toBeInTheDocument();
  });

  it("uploads a file successfully, calls onComplete, and enables the OK button", async () => {
    const onProcessFile = vi.fn().mockResolvedValue({ id: "uploaded-1" });
    const onComplete = vi.fn();
    const onClose = vi.fn();

    render(
      <TrackUploadPopup
        files={[makeFile("a.mp3")]}
        onProcessFile={onProcessFile}
        onComplete={onComplete}
        onClose={onClose}
        uploadTimeoutMs={100000}
      />,
    );

    await waitFor(() => expect(screen.getByText("Uploaded")).toBeInTheDocument());
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith([{ id: "uploaded-1" }]));

    const okButton = screen.getByRole("button", { name: "OK" });
    expect(okButton).not.toBeDisabled();

    fireEvent.click(okButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a generic error message when the upload rejects", async () => {
    const onProcessFile = vi.fn().mockRejectedValue(new Error("boom"));

    render(<TrackUploadPopup files={[makeFile("a.mp3")]} onProcessFile={onProcessFile} uploadTimeoutMs={100000} />);

    await waitFor(() => expect(screen.getByText("Failed")).toBeInTheDocument());
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("shows a specific message for InvalidInputError", async () => {
    const error = new Error("bad input");
    error.name = "InvalidInputError";
    const onProcessFile = vi.fn().mockRejectedValue(error);

    render(<TrackUploadPopup files={[makeFile("a.mp3")]} onProcessFile={onProcessFile} uploadTimeoutMs={100000} />);

    await waitFor(() =>
      expect(screen.getByText(/Upload failed due to invalid file data/)).toBeInTheDocument(),
    );
  });

  it("shows a specific message for ZodError", async () => {
    const error = new Error("schema mismatch");
    error.name = "ZodError";
    const onProcessFile = vi.fn().mockRejectedValue(error);

    render(<TrackUploadPopup files={[makeFile("a.mp3")]} onProcessFile={onProcessFile} uploadTimeoutMs={100000} />);

    await waitFor(() => expect(screen.getByText(/Upload failed due to a server error/)).toBeInTheDocument());
  });

  it("treats a hanging upload as a timeout error", async () => {
    const onProcessFile = vi.fn(() => new Promise(() => {}));

    render(<TrackUploadPopup files={[makeFile("a.mp3")]} onProcessFile={onProcessFile} uploadTimeoutMs={20} />);

    await waitFor(() => expect(screen.getByText(/timed out/)).toBeInTheDocument(), { timeout: 2000 });
  });

  it("uploads multiple files sequentially and reports a mixed successful/failed summary", async () => {
    const onProcessFile = vi
      .fn()
      .mockResolvedValueOnce({ id: "up-1" })
      .mockRejectedValueOnce(new Error("nope"));

    render(
      <TrackUploadPopup
        files={[makeFile("a.mp3"), makeFile("b.mp3")]}
        onProcessFile={onProcessFile}
        uploadTimeoutMs={100000}
      />,
    );

    await waitFor(() => expect(screen.getByText(/1 successful, 1 failed/)).toBeInTheDocument());
    expect(onProcessFile).toHaveBeenCalledTimes(2);
  });

  it("reports an empty successful list when every upload fails", async () => {
    const onProcessFile = vi.fn().mockRejectedValue(new Error("nope"));
    const onComplete = vi.fn();

    render(
      <TrackUploadPopup
        files={[makeFile("a.mp3")]}
        onProcessFile={onProcessFile}
        onComplete={onComplete}
        uploadTimeoutMs={100000}
      />,
    );

    await waitFor(() => expect(screen.getByText(/0 successful, 1 failed/)).toBeInTheDocument());
    expect(onComplete).toHaveBeenCalledWith([]);
  });

  it("advances the in-flight item's progress bar while leaving the others untouched", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const onProcessFile = vi.fn(() => new Promise(() => {}));

    render(
      <TrackUploadPopup
        files={[makeFile("a.mp3"), makeFile("b.mp3")]}
        onProcessFile={onProcessFile}
        uploadTimeoutMs={100000}
      />,
    );
    await waitFor(() => expect(screen.getByText("Uploading...")).toBeInTheDocument());

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect((document.querySelector(".transition-all") as HTMLElement).style.width).toBe("4%");
    expect(screen.getByText("Pending")).toBeInTheDocument();
    vi.useRealTimers();
    vi.mocked(Math.random).mockRestore();
  });

  it.each([
    ["resolves", (settle: Settle) => settle.resolve({ id: "late" })],
    ["rejects", (settle: Settle) => settle.reject(new Error("late"))],
  ])("tolerates an upload that %s after the popup unmounted", async (_label, finish) => {
    let settle!: Settle;
    const onProcessFile = vi.fn(() => new Promise((resolve, reject) => (settle = { resolve, reject })));

    const { unmount } = render(
      <TrackUploadPopup files={[makeFile("a.mp3")]} onProcessFile={onProcessFile} uploadTimeoutMs={100000} />,
    );
    await waitFor(() => expect(onProcessFile).toHaveBeenCalled());

    unmount();
    finish(settle);
    await act(async () => {
      await Promise.resolve();
    });

    expect(onProcessFile).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["resolves", (settle: Settle) => settle.resolve({ id: "stale" })],
    ["rejects", (settle: Settle) => settle.reject(new Error("stale"))],
  ])("restarts on a new file list and ignores an old upload that %s later", async (_label, finish) => {
    let settle!: Settle;
    const onProcessFile = vi
      .fn()
      .mockResolvedValueOnce({ id: "a" })
      .mockImplementationOnce(() => new Promise((resolve, reject) => (settle = { resolve, reject })))
      .mockResolvedValue({ id: "next" });
    const onComplete = vi.fn();
    const first = [makeFile("a.mp3"), makeFile("b.mp3"), makeFile("c.mp3")];
    const second = [makeFile("d.mp3"), makeFile("e.mp3"), makeFile("f.mp3")];

    const { rerender } = render(
      <TrackUploadPopup files={first} onProcessFile={onProcessFile} onComplete={onComplete} uploadTimeoutMs={100000} />,
    );
    await waitFor(() => expect(onProcessFile).toHaveBeenCalledTimes(2));

    rerender(
      <TrackUploadPopup files={second} onProcessFile={onProcessFile} onComplete={onComplete} uploadTimeoutMs={100000} />,
    );
    await waitFor(() => expect(screen.getByText(/3 successful, 0 failed/)).toBeInTheDocument());
    await act(async () => {
      finish(settle);
    });

    expect(onProcessFile.mock.calls.slice(2).map(([file]) => file)).toEqual(second);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith([{ id: "next" }, { id: "next" }, { id: "next" }]);
    expect(screen.getByText(/3 successful, 0 failed/)).toBeInTheDocument();
  });

  it("does not reset upload state when re-rendered with the same files", async () => {
    const onProcessFile = vi.fn().mockResolvedValue({ id: "up-1" });

    const { rerender } = render(
      <TrackUploadPopup files={[makeFile("a.mp3")]} onProcessFile={onProcessFile} uploadTimeoutMs={100000} />,
    );

    await waitFor(() => expect(screen.getByText("Uploaded")).toBeInTheDocument());

    rerender(<TrackUploadPopup files={[makeFile("a.mp3")]} onProcessFile={onProcessFile} uploadTimeoutMs={100000} />);

    expect(onProcessFile).toHaveBeenCalledTimes(1);
  });
});
