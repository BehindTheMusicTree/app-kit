import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useTrackUpload } from "./useTrackUpload";

const makeFile = (name: string) => new File(["x"], name, { type: "audio/mpeg" });

describe("useTrackUpload", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uploads files one after the other and reports completion", async () => {
    const onProcessFile = vi.fn().mockImplementation(async (file: File) => ({ name: file.name }));
    const onComplete = vi.fn();
    const files = [makeFile("a.mp3"), makeFile("b.mp3")];

    const { result } = renderHook(() =>
      useTrackUpload({ files, genre: "rock", onProcessFile, onComplete, uploadTimeoutMs: 5000 }),
    );

    await waitFor(() => expect(result.current.allComplete).toBe(true));

    expect(onProcessFile).toHaveBeenNthCalledWith(1, files[0], "rock");
    expect(onProcessFile).toHaveBeenNthCalledWith(2, files[1], "rock");
    expect(result.current.successfulCount).toBe(2);
    expect(result.current.errorCount).toBe(0);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith([{ name: "a.mp3" }, { name: "b.mp3" }]);
  });

  it("marks a failing file as error and carries on", async () => {
    const onProcessFile = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ name: "b.mp3" });
    const files = [makeFile("a.mp3"), makeFile("b.mp3")];

    const { result } = renderHook(() => useTrackUpload({ files, onProcessFile, uploadTimeoutMs: 5000 }));

    await waitFor(() => expect(result.current.allComplete).toBe(true));

    expect(result.current.items[0].status).toBe("error");
    expect(result.current.items[0].error?.message).toBe("boom");
    expect(result.current.items[1].status).toBe("success");
    expect(result.current.errorCount).toBe(1);
    expect(result.current.successfulCount).toBe(1);
  });

  it("fails an upload that exceeds the timeout", async () => {
    const onProcessFile = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useTrackUpload({ files: [makeFile("a.mp3")], onProcessFile, uploadTimeoutMs: 1000 }),
    );

    await waitFor(() => expect(result.current.isUploading).toBe(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => expect(result.current.items[0].status).toBe("error"));
    expect(result.current.items[0].error?.message).toMatch(/timed out/i);
  });

  it("advances progress while uploading, capped below 100", async () => {
    const onProcessFile = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.spyOn(Math, "random").mockReturnValue(1);
    const { result } = renderHook(() =>
      useTrackUpload({ files: [makeFile("a.mp3")], onProcessFile, uploadTimeoutMs: 60000 }),
    );

    await waitFor(() => expect(result.current.isUploading).toBe(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800 * 20);
    });

    expect(result.current.items[0].progress).toBe(99);
    vi.mocked(Math.random).mockRestore();
  });

  it("restarts when the file list changes and ignores the stale run", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const onProcessFile = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValue({ name: "c.mp3" });
    const onComplete = vi.fn();

    const { result, rerender } = renderHook(
      ({ files }: { files: File[] }) => useTrackUpload({ files, onProcessFile, onComplete, uploadTimeoutMs: 5000 }),
      { initialProps: { files: [makeFile("a.mp3")] } },
    );
    await waitFor(() => expect(result.current.isUploading).toBe(true));

    rerender({ files: [makeFile("c.mp3")] });
    await waitFor(() => expect(result.current.allComplete).toBe(true));

    await act(async () => {
      resolveFirst({ name: "a.mp3" });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].file.name).toBe("c.mp3");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("ignores a failure that lands after the file list changed", async () => {
    let rejectFirst: (error: unknown) => void = () => {};
    const onProcessFile = vi
      .fn()
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValue({ name: "c.mp3" });

    const { result, rerender } = renderHook(
      ({ files }: { files: File[] }) => useTrackUpload({ files, onProcessFile, uploadTimeoutMs: 5000 }),
      { initialProps: { files: [makeFile("a.mp3")] } },
    );
    await waitFor(() => expect(result.current.isUploading).toBe(true));

    rerender({ files: [makeFile("c.mp3")] });
    await waitFor(() => expect(result.current.allComplete).toBe(true));
    await act(async () => {
      rejectFirst(new Error("late"));
    });

    expect(result.current.errorCount).toBe(0);
    expect(result.current.successfulCount).toBe(1);
  });

  it("does nothing for an empty file list and clears its interval on unmount", async () => {
    const onProcessFile = vi.fn().mockReturnValue(new Promise(() => {}));
    const empty = renderHook(() => useTrackUpload({ files: [], onProcessFile, uploadTimeoutMs: 1000 }));
    expect(empty.result.current.allComplete).toBe(false);
    expect(onProcessFile).not.toHaveBeenCalled();

    const { result, unmount } = renderHook(() =>
      useTrackUpload({ files: [makeFile("a.mp3")], onProcessFile, uploadTimeoutMs: 60000 }),
    );
    await waitFor(() => expect(result.current.isUploading).toBe(true));
    unmount();
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1);
  });
});
