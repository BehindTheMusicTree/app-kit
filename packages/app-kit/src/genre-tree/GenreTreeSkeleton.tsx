"use client";

import { useId } from "react";

// These values approximate the real GenreTree's visual tokens (card corner radius, surface
// and connector colors) rather than importing them, since the @behindthemusictree/genre-tree-view
// package only publicly exports GenreTree, getGenreTreeColor, and types — not its internal
// dimension/style constants.
const CARD_FILL = "#F4F4F5";
const CARD_BORDER_COLOR = "#E4E4E7";
const CONNECTOR_COLOR = "#D4D4D8";
const CORNER_RADIUS = 8;
const SHIMMER_HIGHLIGHT_COLOR = "#FFFFFF";

// A real genre tree can fan out into dozens of subgenres, so the skeleton uses a similarly
// large node count (~50) rather than a token 1-3-2 shape, to read as "a big tree is loading"
// instead of "a few items are loading".
const CHILD_COUNT = 10;
const LEAVES_PER_CHILD = 4;

const ROOT_WIDTH = 200;
const ROOT_HEIGHT = 36;
const CHILD_WIDTH = 170;
const CHILD_HEIGHT = 24;
const LEAF_WIDTH = 140;
const LEAF_HEIGHT = 14;
const LEAF_ROW_HEIGHT = 20;
const GROUP_GAP = 12;
const COLUMN_GAP = 120;
const PADDING_X = 16;
const PADDING_Y = 20;

const SHIMMER_BAND_WIDTH = 160;

type Card = { x: number; y: number; width: number; height: number };

const ROOT_X = PADDING_X;
const CHILD_X = ROOT_X + ROOT_WIDTH + COLUMN_GAP;
const LEAF_X = CHILD_X + CHILD_WIDTH + COLUMN_GAP;

const LEAF_CARDS: Card[] = [];
const CHILD_LEAF_RANGES: { start: number; end: number }[] = [];
let cursorY = PADDING_Y;
for (let c = 0; c < CHILD_COUNT; c++) {
  const start = LEAF_CARDS.length;
  for (let l = 0; l < LEAVES_PER_CHILD; l++) {
    LEAF_CARDS.push({
      x: LEAF_X,
      y: cursorY,
      width: LEAF_WIDTH,
      height: LEAF_HEIGHT,
    });
    cursorY += LEAF_ROW_HEIGHT;
  }
  CHILD_LEAF_RANGES.push({ start, end: LEAF_CARDS.length - 1 });
  cursorY += GROUP_GAP;
}
const VIEWBOX_HEIGHT = cursorY - GROUP_GAP + PADDING_Y;
const VIEWBOX_WIDTH = LEAF_X + LEAF_WIDTH + PADDING_X;

function leafCenterY(index: number) {
  return LEAF_CARDS[index].y + LEAF_CARDS[index].height / 2;
}

const CHILD_CARDS: Card[] = CHILD_LEAF_RANGES.map(({ start, end }) => {
  const centerY = (leafCenterY(start) + leafCenterY(end)) / 2;
  return {
    x: CHILD_X,
    y: centerY - CHILD_HEIGHT / 2,
    width: CHILD_WIDTH,
    height: CHILD_HEIGHT,
  };
});

const ROOT_CARD: Card = {
  x: ROOT_X,
  y:
    (leafCenterY(0) + leafCenterY(LEAF_CARDS.length - 1)) / 2 - ROOT_HEIGHT / 2,
  width: ROOT_WIDTH,
  height: ROOT_HEIGHT,
};

const ALL_CARDS: { card: Card; rootAccent?: boolean }[] = [
  { card: ROOT_CARD, rootAccent: true },
  ...CHILD_CARDS.map((card) => ({ card })),
  ...LEAF_CARDS.map((card) => ({ card })),
];

const ALL_LINKS: { from: Card; to: Card }[] = [
  ...CHILD_CARDS.map((child) => ({ from: ROOT_CARD, to: child })),
  ...CHILD_CARDS.flatMap((child, childIndex) => {
    const { start, end } = CHILD_LEAF_RANGES[childIndex];
    return LEAF_CARDS.slice(start, end + 1).map((leaf) => ({
      from: child,
      to: leaf,
    }));
  }),
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
        strokeWidth={rootAccent ? 1.5 : 1}
      />
      {rootAccent && (
        <circle
          cx={card.x + 18}
          cy={card.y + card.height / 2}
          r={5}
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
                strokeWidth={1.25}
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
            strokeWidth={1.25}
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
