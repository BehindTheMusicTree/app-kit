"use client";

import { useRef } from "react";
import { FaFileUpload, FaFolderOpen } from "react-icons/fa";

export interface UploadButtonsProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadButtons({ onFileChange }: UploadButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  const handleFileUploadAction = () => {
    fileInputRef.current?.click();
  };

  const handleDirectoryUploadAction = () => {
    directoryInputRef.current?.click();
  };

  return (
    <div className="flex my-4">
      <div>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} multiple onChange={onFileChange} />
        <button className="action-round-button" onClick={handleFileUploadAction}>
          <FaFileUpload size={32} />
        </button>
      </div>
      <div className="ml-2">
        <input
          type="file"
          ref={directoryInputRef}
          style={{ display: "none" }}
          multiple
          // @ts-expect-error non-standard attribute for directory selection, supported by Chromium/Firefox
          webkitdirectory=""
          onChange={onFileChange}
        />
        <button className="action-round-button" onClick={handleDirectoryUploadAction}>
          <FaFolderOpen size={32} />
        </button>
      </div>
    </div>
  );
}
