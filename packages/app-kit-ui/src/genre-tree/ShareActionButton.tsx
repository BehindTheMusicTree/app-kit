"use client";

import { Share2 } from "lucide-react";
import { usePopup } from "@behindthemusictree/app-kit/popup";
import type { GenreTreeShareTarget } from "./share";
import SharePopup from "./SharePopup";

type ShareActionButtonProps = {
  target: GenreTreeShareTarget;
  url: string;
};

export default function ShareActionButton({ target, url }: ShareActionButtonProps) {
  const { showPopup, hidePopup } = usePopup();

  const openSharePopup = () => {
    showPopup(<SharePopup target={target} url={url} onClose={hidePopup} />);
  };

  return (
    <button
      type="button"
      onClick={openSharePopup}
      className="group flex flex-col items-center gap-1 w-16 text-xs text-center text-[var(--color-text)] focus-visible:outline-none"
      aria-label={`Share ${target.name}`}
      title={`Share ${target.name}`}
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-full group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-focus-ring)] bg-[var(--color-surface-muted)] transition-colors group-hover:bg-[var(--color-border)]">
        <Share2 aria-hidden="true" className="w-5 h-5" />
      </span>
      Share
    </button>
  );
}
