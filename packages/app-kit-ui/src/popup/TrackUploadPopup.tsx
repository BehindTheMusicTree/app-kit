"use client";

import { MdError, MdCheckCircle, MdUpload } from "react-icons/md";
import { useTrackUpload, type UploadStatus, type UseTrackUploadOptions } from "@behindthemusictree/app-kit/popup";
import { BasePopup, BasePopupProps } from "./BasePopup";

type TrackUploadPopupProps = Omit<BasePopupProps, "title" | "children" | "icon" | "isDismissable"> &
  UseTrackUploadOptions & {
    onClose?: () => void;
  };

function getStatusIcon(status: UploadStatus) {
  switch (status) {
    case "success":
      return <MdCheckCircle className="text-[var(--color-green-500)]" size={20} />;
    case "error":
      return <MdError className="text-[var(--color-red-500)]" size={20} />;
    case "uploading":
      return <MdUpload className="text-[var(--color-blue-500)] animate-pulse" size={20} />;
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-[var(--color-neutral-300)]" />;
  }
}

function getStatusText(status: UploadStatus) {
  switch (status) {
    case "success":
      return "Uploaded";
    case "error":
      return "Failed";
    case "uploading":
      return "Uploading...";
    default:
      return "Pending";
  }
}

export default function TrackUploadPopup({
  files,
  genre,
  onProcessFile,
  onComplete,
  onClose,
  uploadTimeoutMs,
  ...rest
}: TrackUploadPopupProps) {
  const { items, isUploading, allComplete, successfulCount, errorCount } = useTrackUpload({
    files,
    genre,
    onProcessFile,
    onComplete,
    uploadTimeoutMs,
  });

  const displayTotal = items.length > 0 ? items.length : files.length;

  return (
    <BasePopup
      {...rest}
      onClose={onClose}
      title={`Upload Tracks (${successfulCount}/${displayTotal})`}
      isDismissable
      showOkButton
      okButtonText="OK"
      okButtonDisabled={isUploading || !allComplete}
      onOk={onClose}
    >
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {getStatusIcon(item.status)}
                <div>
                  <div className="font-medium text-sm truncate max-w-xs" title={item.file.name}>
                    {item.file.name}
                  </div>
                  <div className="text-xs text-[var(--color-neutral-500)]">{(item.file.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </div>
              <div className="text-sm text-[var(--color-neutral-600)]">{getStatusText(item.status)}</div>
            </div>

            {item.status === "uploading" && (
              <div className="w-full bg-[var(--color-neutral-200)] rounded-full h-2">
                <div
                  className="bg-[var(--color-blue-500)] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}

            {item.status === "error" && item.error && (
              <div className="text-[var(--color-red-500)] text-sm mt-2">
                {item.error.name === "InvalidInputError"
                  ? "Upload failed due to invalid file data. Please check your file and try again."
                  : item.error.name === "ZodError"
                    ? "Upload failed due to a server error. Please try again later."
                    : item.error.message}
              </div>
            )}
          </div>
        ))}

        {allComplete && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-[var(--color-neutral-600)]">
              {successfulCount} successful, {errorCount} failed
            </div>
          </div>
        )}
      </div>
    </BasePopup>
  );
}
