"use client";

import type { ReactNode } from "react";

export type ShareDestinationButtonProps = {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
};

const className =
  "group flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

function Contents({ icon, label }: Pick<ShareDestinationButtonProps, "icon" | "label">) {
  return (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)] transition-colors group-hover:bg-[var(--color-border)]">
        {icon}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </>
  );
}

export default function ShareDestinationButton({
  label,
  icon,
  href,
  onClick,
  disabled = false,
  ariaLabel,
}: ShareDestinationButtonProps) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} className={className}>
        <Contents icon={icon} label={label} />
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={className}>
      <Contents icon={icon} label={label} />
    </button>
  );
}
