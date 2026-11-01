"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Share2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import BasePopup from "../popup/BasePopup";
import Toast from "../popup/Toast";
import type { GenreTreeShareTarget } from "./share";
import ShareDestinationButton from "./ShareDestinationButton";
import SharePreviewCard from "./SharePreviewCard";

type SharePopupProps = {
  target: GenreTreeShareTarget;
  url: string;
  onClose: () => void;
};

type CopyStatus = "idle" | "failed";

function resolveAbsoluteUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Use the legacy copy path when clipboard access is denied or unavailable.
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    input.remove();
  }
}

export default function SharePopup({ target, url, onClose }: SharePopupProps) {
  const [absoluteUrl, setAbsoluteUrl] = useState(url);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [canUseNativeShare, setCanUseNativeShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [toastId, setToastId] = useState(0);

  useEffect(() => {
    setAbsoluteUrl(resolveAbsoluteUrl(url) ?? "");
    setCopyStatus("idle");
    setShareError(null);
  }, [url]);

  useEffect(() => {
    setCanUseNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const destinationUrls = useMemo(() => {
    if (!absoluteUrl) return null;
    const message = `${target.name} — ${absoluteUrl}`;
    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Share: ${target.name}`)}&body=${encodeURIComponent(message)}`,
    };
  }, [absoluteUrl, target.name]);

  const handleCopy = async () => {
    if (!absoluteUrl) {
      setCopyStatus("failed");
      return;
    }
    setShareError(null);
    const copied = await copyText(absoluteUrl);
    setCopyStatus(copied ? "idle" : "failed");
    if (copied) setToastId((id) => id + 1);
  };

  const dismissToast = useCallback(() => setToastId(0), []);

  const handleNativeShare = async () => {
    if (!absoluteUrl || !navigator.share) return;
    setShareError(null);
    try {
      await navigator.share({ title: target.name, url: absoluteUrl });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareError("Could not open the share options.");
    }
  };

  return (
    <>
      <BasePopup
        title="Share"
        onClose={onClose}
        isDismissable
        trapFocus
        closeOnEscape
        closeOnBackdrop
        className="!w-full !max-w-[28rem] overflow-hidden !rounded-[2rem] !bg-[var(--color-surface)] shadow-2xl"
        overlayClassName="!bg-black/50 p-4 backdrop-blur-[2px]"
        titleClassName="!rounded-none !bg-transparent !px-6 !pb-2 !pt-6"
        titleTextClassName="!text-xl !font-semibold !text-[var(--color-text)]"
        closeButtonClassName="!h-10 !w-10 !rounded-none !border-0 !bg-transparent !p-0 !text-[var(--color-text)] hover:!bg-transparent hover:!text-[var(--color-text)]"
        contentClassName="!rounded-none !bg-transparent !px-6 !pb-6 !pt-2"
      >
        <div className="flex flex-col gap-4">
          <SharePreviewCard target={target} url={absoluteUrl || url} />
          <div className="grid grid-cols-3 gap-1 rounded-3xl bg-[var(--color-surface)] p-3 sm:grid-cols-4">
            <ShareDestinationButton
              label="Copy Link"
              icon={<Link2 aria-hidden="true" className="h-6 w-6" />}
              onClick={() => void handleCopy()}
              ariaLabel="Copy link"
              disabled={!absoluteUrl}
            />
            <ShareDestinationButton
              label="WhatsApp"
              icon={<FaWhatsapp aria-hidden="true" className="h-9 w-9 text-[#25D366]" />}
              href={destinationUrls?.whatsapp}
              ariaLabel={`Share ${target.name} via WhatsApp`}
              disabled={!absoluteUrl}
            />
            <ShareDestinationButton
              label="Gmail"
              icon={<SiGmail aria-hidden="true" className="h-8 w-8 text-[#EA4335]" />}
              href={destinationUrls?.gmail}
              ariaLabel={`Email ${target.name} with Gmail`}
              disabled={!absoluteUrl}
            />
            {canUseNativeShare && (
              <ShareDestinationButton
                label="More"
                icon={<Share2 aria-hidden="true" className="h-6 w-6" />}
                onClick={() => void handleNativeShare()}
                ariaLabel="More sharing options"
                disabled={!absoluteUrl}
              />
            )}
          </div>
          {copyStatus === "failed" && (
            <p role="alert" className="text-center text-sm text-[var(--color-red-500)]">
              Could not copy the link.
            </p>
          )}
          {shareError && (
            <p role="alert" className="text-center text-sm text-[var(--color-red-500)]">
              {shareError}
            </p>
          )}
        </div>
      </BasePopup>
      {toastId > 0 && <Toast key={toastId} message="Link copied" onClose={dismissToast} />}
    </>
  );
}
