"use client";

import { useId } from "react";
import { getGenreTreeColor } from "@behindthemusictree/genre-tree-view";

// Mirrors GenreTreeSkeleton's visual tokens so the two skeletons read as the same design system —
// see that file's comment on why these are approximated rather than imported.
const CARD_FILL = "#F4F4F5";
const CARD_BORDER_COLOR = "#E4E4E7";
const CONNECTOR_COLOR = "#D4D4D8";
const RING_COLOR = "#E4E4E7";
const CORNER_RADIUS = 6;
const SHIMMER_HIGHLIGHT_COLOR = "#FFFFFF";
const SECTOR_FILL_OPACITY = 0.16;

const HUB_RADIUS = 46;
const WHEEL_RADIUS = 170;
const CANVAS_PADDING = 20;

// Mirrors the real wheel's root-chip ring: up to 4 "cardinal" roots (top/right/bottom/left) are
// developed with a small radiating subtree, the rest render as a single collapsed stub — see
// getCardinalRingOffsets/computeRadialLayout in the genre-tree-view package. Angles use the same
// CSS rotate() convention (0 = top, clockwise) and must stay ascending for the sector-boundary math
// below.
const CHIP_ANGLES: { angle: number; cardinal: boolean }[] = [
  { angle: 0, cardinal: true },
  { angle: 30, cardinal: false },
  { angle: 60, cardinal: false },
  { angle: 90, cardinal: true },
  { angle: 135, cardinal: false },
  { angle: 180, cardinal: true },
  { angle: 225, cardinal: false },
  { angle: 270, cardinal: true },
  { angle: 315, cardinal: false },
];

const CHIP_WIDTH = 68;
const CHIP_HEIGHT = 22;
const STUB_WIDTH = 40;
const STUB_HEIGHT = 12;
const STUB_DISTANCE = 34;
const BRANCH_LEVEL1_DISTANCE = 66;
const BRANCH_LEVEL2_DISTANCE = 118;
const BRANCH_LEVEL1_SIZE = { width: 56, height: 18 };
const BRANCH_LEVEL2_SIZE = { width: 46, height: 15 };
const BRANCH_FAN_OFFSETS = [-46, 0, 46];

// All geometry below is computed around the origin (0,0); the SVG's viewBox is derived from the
// content's own bounding box afterward (see CANVAS below) instead of assuming a fixed square, so
// cardinal branches — which reach further out than filler stubs — are never clipped.
type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

function pointOnCircle(angleDeg: number, radius: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

function radialUnit(angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad) };
}

function tangentialUnit(angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

function rectCentered(center: Point, width: number, height: number): Rect {
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

type Chip = { rect: Rect; cardinal: boolean; angle: number };
type Branch = { chip: Chip; stub?: Rect; level1?: Rect; level2: Rect[] };

const CHIPS: Chip[] = CHIP_ANGLES.map(({ angle, cardinal }) => ({
  rect: rectCentered(pointOnCircle(angle, WHEEL_RADIUS), CHIP_WIDTH, CHIP_HEIGHT),
  cardinal,
  angle,
}));

const BRANCHES: Branch[] = CHIPS.map((chip) => {
  const chipOuterEdge = pointOnCircle(chip.angle, WHEEL_RADIUS + chip.rect.height / 2);
  const radial = radialUnit(chip.angle);

  if (!chip.cardinal) {
    const stubCenter = {
      x: chipOuterEdge.x + radial.x * STUB_DISTANCE,
      y: chipOuterEdge.y + radial.y * STUB_DISTANCE,
    };
    return { chip, stub: rectCentered(stubCenter, STUB_WIDTH, STUB_HEIGHT), level2: [] };
  }

  const level1Center = {
    x: chipOuterEdge.x + radial.x * BRANCH_LEVEL1_DISTANCE,
    y: chipOuterEdge.y + radial.y * BRANCH_LEVEL1_DISTANCE,
  };
  const level1 = rectCentered(level1Center, BRANCH_LEVEL1_SIZE.width, BRANCH_LEVEL1_SIZE.height);

  const tangential = tangentialUnit(chip.angle);
  const level2Base = {
    x: chipOuterEdge.x + radial.x * BRANCH_LEVEL2_DISTANCE,
    y: chipOuterEdge.y + radial.y * BRANCH_LEVEL2_DISTANCE,
  };
  const level2 = BRANCH_FAN_OFFSETS.map((offset) =>
    rectCentered(
      { x: level2Base.x + tangential.x * offset, y: level2Base.y + tangential.y * offset },
      BRANCH_LEVEL2_SIZE.width,
      BRANCH_LEVEL2_SIZE.height,
    ),
  );

  return { chip, level1, level2 };
});

function connectorPath(from: Point, to: Point) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  return `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`;
}

const ALL_LINKS: { from: Point; to: Point }[] = [];
for (const branch of BRANCHES) {
  const chipCenter = rectCenter(branch.chip.rect);
  if (branch.stub) {
    ALL_LINKS.push({ from: chipCenter, to: rectCenter(branch.stub) });
  }
  if (branch.level1) {
    ALL_LINKS.push({ from: chipCenter, to: rectCenter(branch.level1) });
    const level1Center = rectCenter(branch.level1);
    for (const child of branch.level2) {
      ALL_LINKS.push({ from: level1Center, to: rectCenter(child) });
    }
  }
}

const ALL_RECTS: Rect[] = [
  ...CHIPS.map((chip) => chip.rect),
  ...BRANCHES.flatMap((branch) => [
    ...(branch.stub ? [branch.stub] : []),
    ...(branch.level1 ? [branch.level1] : []),
    ...branch.level2,
  ]),
];

// One color sector per chip, filling the background between the midpoints to its neighbors —
// mirrors the real wheel's per-root color (getGenreTreeColor(rootId)), seeded by ring position
// since the skeleton renders before any real genre id is known.
type Sector = { path: string; color: string };

const SECTOR_OUTER_RADIUS = (() => {
  let maxAbs = HUB_RADIUS;
  for (const rect of ALL_RECTS) {
    for (const [x, y] of [
      [rect.x, rect.y],
      [rect.x + rect.width, rect.y],
      [rect.x, rect.y + rect.height],
      [rect.x + rect.width, rect.y + rect.height],
    ]) {
      maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y));
    }
  }
  return maxAbs;
})();

const SECTORS: Sector[] = CHIP_ANGLES.map(({ angle }, i) => {
  const prevAngle = i === 0 ? CHIP_ANGLES[CHIP_ANGLES.length - 1].angle - 360 : CHIP_ANGLES[i - 1].angle;
  const nextAngle = i === CHIP_ANGLES.length - 1 ? CHIP_ANGLES[0].angle + 360 : CHIP_ANGLES[i + 1].angle;
  const startAngle = (prevAngle + angle) / 2;
  const endAngle = (angle + nextAngle) / 2;
  const start = pointOnCircle(startAngle, SECTOR_OUTER_RADIUS);
  const end = pointOnCircle(endAngle, SECTOR_OUTER_RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return {
    path: `M0,0 L${start.x},${start.y} A${SECTOR_OUTER_RADIUS},${SECTOR_OUTER_RADIUS} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`,
    color: getGenreTreeColor(`wheel-skeleton-sector-${i}`),
  };
});

const CANVAS = (() => {
  let minX = -SECTOR_OUTER_RADIUS;
  let maxX = SECTOR_OUTER_RADIUS;
  let minY = -SECTOR_OUTER_RADIUS;
  let maxY = SECTOR_OUTER_RADIUS;
  for (const rect of ALL_RECTS) {
    minX = Math.min(minX, rect.x);
    maxX = Math.max(maxX, rect.x + rect.width);
    minY = Math.min(minY, rect.y);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return {
    minX: minX - CANVAS_PADDING,
    minY: minY - CANVAS_PADDING,
    width: maxX - minX + CANVAS_PADDING * 2,
    height: maxY - minY + CANVAS_PADDING * 2,
  };
})();

export function GenreTreeWheelSkeleton() {
  // Unique per mount so multiple skeletons on one page don't collide on <defs> ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `genre-tree-wheel-skeleton-gradient-${uid}`;
  const maskId = `genre-tree-wheel-skeleton-mask-${uid}`;
  const animationName = `genre-tree-wheel-skeleton-spin-${uid}`;
  const shimmerWedgeClass = `genre-tree-wheel-skeleton-shimmer-wedge-${uid}`;

  return (
    <div className="mt-5 p-4 flex justify-center">
      <span className="sr-only">Loading genre tree…</span>
      <svg
        viewBox={`${CANVAS.minX} ${CANVAS.minY} ${CANVAS.width} ${CANVAS.height}`}
        width={CANVAS.width}
        height={CANVAS.height}
        className="max-w-full h-auto"
        aria-hidden="true"
      >
        <style>{`
          @keyframes ${animationName} {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .${shimmerWedgeClass} {
            transform-origin: 0px 0px;
            animation: ${animationName} 2.4s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .${shimmerWedgeClass} {
              animation: none;
            }
          }
        `}</style>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SHIMMER_HIGHLIGHT_COLOR} stopOpacity={0} />
            <stop offset="50%" stopColor={SHIMMER_HIGHLIGHT_COLOR} stopOpacity={0.9} />
            <stop offset="100%" stopColor={SHIMMER_HIGHLIGHT_COLOR} stopOpacity={0} />
          </linearGradient>
          {/* White = visible: masks the shimmer wedge to the wheel's own silhouette so the sweep
              only lights up chips, branches, and connectors, never the empty space between them. */}
          <mask id={maskId}>
            <circle cx={0} cy={0} r={HUB_RADIUS} fill="#FFFFFF" />
            {ALL_LINKS.map((link, i) => (
              <path
                key={`link-mask-${i}`}
                d={connectorPath(link.from, link.to)}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.25}
              />
            ))}
            {ALL_RECTS.map((rect, i) => (
              <rect
                key={`rect-mask-${i}`}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={CORNER_RADIUS}
                ry={CORNER_RADIUS}
                fill="#FFFFFF"
              />
            ))}
          </mask>
        </defs>

        {SECTORS.map((sector, i) => (
          <path key={`sector-${i}`} d={sector.path} fill={sector.color} fillOpacity={SECTOR_FILL_OPACITY} />
        ))}

        <circle
          cx={0}
          cy={0}
          r={WHEEL_RADIUS}
          fill="none"
          stroke={RING_COLOR}
          strokeWidth={1}
          strokeDasharray="2 6"
        />

        {ALL_LINKS.map((link, i) => (
          <path key={`link-${i}`} d={connectorPath(link.from, link.to)} fill="none" stroke={CONNECTOR_COLOR} strokeWidth={1.25} />
        ))}

        {ALL_RECTS.map((rect, i) => (
          <rect
            key={`rect-${i}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx={CORNER_RADIUS}
            ry={CORNER_RADIUS}
            fill={CARD_FILL}
            stroke={CARD_BORDER_COLOR}
            strokeWidth={1}
          />
        ))}

        <circle cx={0} cy={0} r={HUB_RADIUS} fill={CARD_FILL} stroke={CARD_BORDER_COLOR} strokeWidth={1.5} />
        <circle cx={0} cy={0} r={5} fill={CONNECTOR_COLOR} />

        <g mask={`url(#${maskId})`}>
          <g className={shimmerWedgeClass}>
            <path
              d={`M0,0 L0,${-CANVAS.height} A${CANVAS.height},${CANVAS.height} 0 0 1 ${
                CANVAS.height * Math.sin((40 * Math.PI) / 180)
              },${-CANVAS.height * Math.cos((40 * Math.PI) / 180)} Z`}
              fill={`url(#${gradientId})`}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
