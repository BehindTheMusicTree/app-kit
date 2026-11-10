"use client";

import { Share2 } from "lucide-react";
import { ActionButton } from "@behindthemusictree/ui";
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
    <ActionButton
      icon={<Share2 aria-hidden="true" className="w-5 h-5" />}
      label="Share"
      aria-label={`Share ${target.name}`}
      title={`Share ${target.name}`}
      onClick={openSharePopup}
    />
  );
}
