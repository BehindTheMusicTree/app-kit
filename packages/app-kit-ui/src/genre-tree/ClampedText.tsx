"use client";

import { useLayoutEffect, useRef, useState } from "react";

type ClampedTextProps = {
  children: string;
  className?: string;
};

export function ClampedText({ children, className = "" }: ClampedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    setOverflows(element.scrollHeight > element.clientHeight);
  }, [children, expanded]);

  return (
    <>
      <p ref={ref} className={`${className} ${expanded ? "" : "line-clamp-3"}`}>
        {children}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}
