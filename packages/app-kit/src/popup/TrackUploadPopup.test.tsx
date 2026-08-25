import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import TrackUploadPopup from "./TrackUploadPopup";

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
