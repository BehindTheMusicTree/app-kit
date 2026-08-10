// These values approximate the real GenreTree's visual tokens (card corner radius, surface
// and connector colors) rather than importing them, since the @behindthemusictree/genre-tree-view
// package only publicly exports GenreTree, getGenreTreeColor, and types — not its internal
// dimension/style constants.
const CARD_FILL = "#F4F4F5";
const CARD_BORDER_COLOR = "#E4E4E7";
const CONNECTOR_COLOR = "#D4D4D8";
const CORNER_RADIUS = 8;

const ROOT_CARD = { x: 10, y: 80, width: 160, height: 40 };
const CHILD_CARDS = [
  { x: 260, y: 23, width: 140, height: 34 },
  { x: 260, y: 83, width: 140, height: 34 },
  { x: 260, y: 143, width: 140, height: 34 },
];
const GRANDCHILD_CARDS = [
  { x: 490, y: 10, width: 120, height: 30 },
  { x: 490, y: 40, width: 120, height: 30 },
];

type Card = { x: number; y: number; width: number; height: number };

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
          cx={card.x + 16}
          cy={card.y + card.height / 2}
          r={4}
          fill={CONNECTOR_COLOR}
        />
      )}
    </>
  );
}

export function GenreTreeSkeleton() {
  return (
    <div className="mt-5 p-4">
      <span className="sr-only">Loading genre tree…</span>
      <svg
        viewBox="0 0 630 200"
        width="630"
        height="200"
        className="max-w-full h-auto"
        aria-hidden="true"
      >
        <g className="animate-pulse">
          {CHILD_CARDS.map((child, i) => (
            <path
              key={`root-link-${i}`}
              d={connectorPath(ROOT_CARD, child)}
              fill="none"
              stroke={CONNECTOR_COLOR}
              strokeWidth={1.5}
            />
          ))}
          {GRANDCHILD_CARDS.map((grandchild, i) => (
            <path
              key={`child-link-${i}`}
              d={connectorPath(CHILD_CARDS[0], grandchild)}
              fill="none"
              stroke={CONNECTOR_COLOR}
              strokeWidth={1.5}
            />
          ))}

          <SkeletonCard card={ROOT_CARD} rootAccent />
          {CHILD_CARDS.map((child, i) => (
            <SkeletonCard key={`child-${i}`} card={child} />
          ))}
          {GRANDCHILD_CARDS.map((grandchild, i) => (
            <SkeletonCard key={`grandchild-${i}`} card={grandchild} />
          ))}
        </g>
      </svg>
    </div>
  );
}
