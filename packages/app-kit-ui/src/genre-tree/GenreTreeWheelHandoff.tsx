"use client";

import { useEffect, useState } from "react";

export type GenreTreeWheelHandoffProps = {
  skeleton: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Keeps `skeleton` fully opaque over `children` for the first two animation frames after
 * `children` mounts, then cross-fades to `children`.
 *
 * `children` is one of genre-tree-view's wheel components (`GenreTreeWheel` /
 * `GenreTreeWheelRadialPopCore`), which compute their own pan/zoom "fit to frame" in a passive
 * effect (`hasInitialFitRef`) that runs *after* their first paint. Without this handoff, that
 * first paint — unfit, `translate(0,0) scale(1)` — is briefly visible the instant the skeleton is
 * swapped out, which reads as a flash/jump right as loading finishes. Two nested
 * `requestAnimationFrame` calls reliably span that effect's own render-commit-paint cycle, so
 * `children` is already laid out and stable by the time it's revealed — the skeleton itself never
 * changes, it just stays up until the real graph is ready underneath it.
 *
 * Remounting this component (e.g. via a `key` change, or the parent unmounting/remounting the
 * branch that renders it) restarts the handoff, which is what's wanted any time `children` itself
 * is about to mount fresh and re-run its own fit-to-frame effect.
 */
export function GenreTreeWheelHandoff({ skeleton, children }: GenreTreeWheelHandoffProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0 transition-opacity duration-150 ease-out"
        style={{ opacity: revealed ? 1 : 0, pointerEvents: revealed ? "auto" : "none" }}
        aria-hidden={!revealed}
      >
        {children}
      </div>
      {!revealed && (
        <div className="absolute inset-0" aria-hidden="true">
          {skeleton}
        </div>
      )}
    </div>
  );
}
