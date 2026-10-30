"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ToastProps = {
  message: string;
  onClose: () => void;
  durationMs?: number;
};

export default function Toast({ message, onClose, durationMs = 2200 }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timeout = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-auto w-full max-w-md rounded-md bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-text)] shadow-lg ring-1 ring-black/10"
      >
        {message}
      </div>
    </div>,
    document.body,
  );
}
