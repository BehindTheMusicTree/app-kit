"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type UploadStatus = "pending" | "uploading" | "success" | "error";

export type TrackUploadItem = {
  id: string;
  file: File;
  genre: string | null;
  status: UploadStatus;
  progress: number;
  error?: Error | null;
  uploadedTrack?: unknown;
};

export interface UseTrackUploadOptions {
  files: File[];
  genre?: string | null;
  onProcessFile: (file: File, genre?: string | null) => Promise<unknown>;
  onComplete?: (uploadedTracks: unknown[]) => void;
  /**
   * Timeout (ms) before an in-flight upload is treated as failed. Passed by the consuming app
   * (from whatever env var / config it uses) so this package doesn't assume a specific env var name.
   */
  uploadTimeoutMs: number;
}

export interface UseTrackUploadResult {
  items: TrackUploadItem[];
  isUploading: boolean;
  allComplete: boolean;
  successfulCount: number;
  errorCount: number;
}

/** Uploads `files` one after the other through `onProcessFile`, restarting whenever the file list or genre changes. */
export function useTrackUpload({
  files,
  genre,
  onProcessFile,
  onComplete,
  uploadTimeoutMs,
}: UseTrackUploadOptions): UseTrackUploadResult {
  const [items, setItems] = useState<TrackUploadItem[]>([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [allComplete, setAllComplete] = useState(false);

  const lastFilesKeyRef = useRef<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runRef = useRef(0);
  const completedRunRef = useRef<number | null>(null);

  useEffect(() => {
    const filesKey = `${files.length}-${files.map((f) => `${f.name}:${f.size}`).join("|")}-${genre ?? ""}`;
    if (lastFilesKeyRef.current === filesKey) return;
    lastFilesKeyRef.current = filesKey;
    runRef.current += 1;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setItems(
      files.map((file, index) => ({
        id: `upload-${index}-${file.name}`,
        file,
        genre: genre ?? null,
        status: "pending" as UploadStatus,
        progress: 0,
      })),
    );
    setCurrentUploadIndex(0);
    setIsUploading(false);
    setAllComplete(false);
  }, [files, genre]);

  const startNextUpload = useCallback(() => {
    const currentItem = items[currentUploadIndex];
    setIsUploading(true);

    setItems((prev) =>
      prev.map((item, index) => (index === currentUploadIndex ? { ...item, status: "uploading", progress: 0 } : item)),
    );

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setItems((prev) =>
        prev.map((item, index) =>
          index === currentUploadIndex && item.status === "uploading"
            ? { ...item, progress: Math.min(item.progress + Math.random() * 8, 99) }
            : item,
        ),
      );
    }, 800);

    const uploadingIndex = currentUploadIndex;
    const run = runRef.current;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Upload timed out. The server took too long to respond.")), uploadTimeoutMs);
    });

    Promise.race([onProcessFile(currentItem.file, currentItem.genre), timeoutPromise])
      .then((data) => {
        if (run !== runRef.current) return;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setItems((prev) =>
          prev.map((item, index) =>
            index === uploadingIndex ? { ...item, status: "success", progress: 100, uploadedTrack: data } : item,
          ),
        );
        setIsUploading(false);
        setCurrentUploadIndex((prev) => prev + 1);
      })
      .catch((error) => {
        if (run !== runRef.current) return;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setItems((prev) =>
          prev.map((item, index) => (index === uploadingIndex ? { ...item, status: "error", error } : item)),
        );
        setIsUploading(false);
        setCurrentUploadIndex((prev) => prev + 1);
      });
  }, [items, currentUploadIndex, onProcessFile, uploadTimeoutMs]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const shouldStart = items.length > 0 && !isUploading && currentUploadIndex < items.length;
    if (shouldStart) {
      startNextUpload();
    }
  }, [items, currentUploadIndex, isUploading, startNextUpload]);

  useEffect(() => {
    if (items.length > 0 && currentUploadIndex >= items.length && !isUploading) {
      // React may re-run queued updaters, handing back an equal-but-new items after completion
      if (completedRunRef.current === runRef.current) return;
      completedRunRef.current = runRef.current;
      setAllComplete(true);
      const successfulTracks = items
        .filter((item) => item.status === "success" && item.uploadedTrack)
        .map((item) => item.uploadedTrack);
      onComplete?.(successfulTracks);
    }
  }, [items, currentUploadIndex, isUploading, onComplete]);

  return {
    items,
    isUploading,
    allComplete,
    successfulCount: items.filter((item) => item.status === "success").length,
    errorCount: items.filter((item) => item.status === "error").length,
  };
}
