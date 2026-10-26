"use client";

import { FaYoutube } from "react-icons/fa";

import { NO_VIDEO_LABEL } from "@behindthemusictree/app-kit/genre-tree";

export function UnplayableReason({ reason }: { reason: string }) {
  if (reason !== NO_VIDEO_LABEL) return <>{reason}</>;
  return (
    <span role="img" aria-label={reason} className="relative inline-flex shrink-0 items-center">
      <FaYoutube size={16} aria-hidden="true" />
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-0.5 w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded bg-current" />
    </span>
  );
}
