"use client";

import { useId } from "react";

// These values approximate the real GenreTree's visual tokens (card corner radius, surface
// and connector colors) rather than importing them, since the @behindthemusictree/genre-tree-view
// package only publicly exports GenreTree, getGenreTreeColor, and types — not its internal
// dimension/style constants.
const CARD_FILL = "#F4F4F5";
const CARD_BORDER_COLOR = "#E4E4E7";
const CONNECTOR_COLOR = "#D4D4D8";
const CORNER_RADIUS = 12;
const SHIMMER_HIGHLIGHT_COLOR = "#FFFFFF";

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 320;
const SHIMMER_BAND_WIDTH = 220;

const ROOT_CARD = { x: 16, y: 128, width: 260, height: 64 };
const CHILD_CARDS = [
  { x: 420, y: 36, width: 220, height: 54 },
  { x: 420, y: 133, width: 220, height: 54 },
  { x: 420, y: 230, width: 220, height: 54 },
];
const GRANDCHILD_CARDS = [
  { x: 780, y: 16, width: 190, height: 48 },
  { x: 780, y: 64, width: 190, height: 48 },
];

type Card = { x: number; y: number; width: number; height: number };

const ALL_CARDS: { card: Card; rootAccent?: boolean }[] = [
  { card: ROOT_CARD, rootAccent: true },
  ...CHILD_CARDS.map((card) => ({ card })),
  ...GRANDCHILD_CARDS.map((card) => ({ card })),
];

const ALL_LINKS: { from: Card; to: Card }[] = [
  ...CHILD_CARDS.map((child) => ({ from: ROOT_CARD, to: child })),
  ...GRANDCHILD_CARDS.map((grandchild) => ({
    from: CHILD_CARDS[0],
    to: grandchild,
  })),
];

function cardCenterLeft(card: Card) {
  return { x: card.x, y: card.y + card.height / 2 };
}

function cardCenterRight(card: Card) {
  return { x: card.x + card.width, y: card.y + card.height / 2 };
}

function connectorPath(from: Card, to: Card) {
  const start = cardCenterRight(from);
  const end = cardCenterLeft(to);
  const midX = (start.x + end.x) / 2;
  return `M${start.x},${start.y} C${midX},${start.y} ${midX},${end.y} ${end.x},${end.y}`;
}

function SkeletonCard({
  card,
  rootAccent,
}: {
  card: Card;
  rootAccent?: boolean;
}) {
  return (
    <>
      <rect
        x={card.x}
        y={card.y}
        width={card.width}
        height={card.height}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
        fill={CARD_FILL}
        stroke={CARD_BORDER_COLOR}
        strokeWidth={rootAccent ? 2 : 1.5}
      />
      {rootAccent && (
        <circle
          cx={card.x + 24}
          cy={card.y + card.height / 2}
          r={6}
          fill={CONNECTOR_COLOR}
        />
      )}
    </>
  );
}

export function GenreTreeSkeleton() {
  // Unique per mount so multiple skeletons on one page don't collide on <defs> ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `genre-tree-skeleton-gradient-${uid}`;
  const maskId = `genre-tree-skeleton-mask-${uid}`;
  const animationName = `genre-tree-skeleton-sweep-${uid}`;
  const shimmerBandClass = `genre-tree-skeleton-shimmer-band-${uid}`;
  const sweepDistance = VIEWBOX_WIDTH + SHIMMER_BAND_WIDTH;

  return (
    <div className="mt-5 p-4">
      <span className="sr-only">Loading genre tree…</span>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        width={VIEWBOX_WIDTH}
        height={VIEWBOX_HEIGHT}
        className="max-w-full h-auto"
        aria-hidden="true"
      >
        <style>{`
          @keyframes ${animationName} {
            from { transform: translateX(0); }
            to { transform: translateX(${sweepDistance}px); }
          }
          .${shimmerBandClass} {
            animation: ${animationName} 1.5s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .${shimmerBandClass} {
              animation: none;
            }
          }
        `}</style>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop
              offset="0%"
              stopColor={SHIMMER_HIGHLIGHT_COLOR}
              stopOpacity={0}
            />
            <stop
              offset="50%"
              stopColor={SHIMMER_HIGHLIGHT_COLOR}
              stopOpacity={0.9}
            />
            <stop
              offset="100%"
              stopColor={SHIMMER_HIGHLIGHT_COLOR}
              stopOpacity={0}
            />
          </linearGradient>
          {/* White = visible: masks the shimmer band to the tree's own silhouette so the sweep
              only lights up cards and connectors, never the empty space between them. */}
          <mask id={maskId}>
            {ALL_LINKS.map((link, i) => (
              <path
                key={`link-mask-${i}`}
                d={connectorPath(link.from, link.to)}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
            {ALL_CARDS.map(({ card }, i) => (
              <rect
                key={`card-mask-${i}`}
                x={card.x}
                y={card.y}
                width={card.width}
                height={card.height}
                rx={CORNER_RADIUS}
                ry={CORNER_RADIUS}
                fill="#FFFFFF"
              />
            ))}
          </mask>
        </defs>

        {ALL_LINKS.map((link, i) => (
          <path
            key={`link-${i}`}
            d={connectorPath(link.from, link.to)}
            fill="none"
            stroke={CONNECTOR_COLOR}
            strokeWidth={2}
          />
        ))}
        {ALL_CARDS.map(({ card, rootAccent }, i) => (
          <SkeletonCard key={`card-${i}`} card={card} rootAccent={rootAccent} />
        ))}

        <g mask={`url(#${maskId})`}>
          <rect
            className={shimmerBandClass}
            x={-SHIMMER_BAND_WIDTH}
            y={0}
            width={SHIMMER_BAND_WIDTH}
            height={VIEWBOX_HEIGHT}
            fill={`url(#${gradientId})`}
          />
        </g>
      </svg>
    </div>
  );
}
