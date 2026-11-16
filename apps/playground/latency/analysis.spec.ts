import { test, expect } from "@playwright/test";
import { analyze } from "./surface";

const initial = { at: 0, x: 0, y: 0, k: 1 };
const gesture = {
  initial, final: { ...initial, at: 700, x: 80, y: 10 }, samples: [],
  events: [
    { type: "pointerdown", at: 10, x: 100, y: 100, buttons: 1 },
    { type: "pointermove", at: 20, x: 180, y: 110, buttons: 1 },
    { type: "pointerup", at: 650, x: 180, y: 110, buttons: 0 },
  ],
  injections: [{ start: 20, end: 320, requestedMs: 300 }],
};
const positions = [
  { at: 5, point: { x: 50, y: 50, count: 256 } },
  { at: 340, point: { x: 51, y: 53, count: 256 } },
];

test("surface validity rejects missing frames, interference and a sensor preceding the control", () => {
  expect(analyze([gesture], positions, 300).latencies).toEqual([320]);
  expect(analyze([gesture], positions, 300).clickLatencies).toEqual([330]);
  expect(analyze([gesture], positions, 300).inputGaps).toEqual([10]);
  expect(() => analyze([gesture], positions.slice(1), 300)).toThrow("Missing stationary pre-input");
  expect(() => analyze([gesture], positions.slice(0, 1), 300)).toThrow("Missing moved surface");
  expect(() => analyze([{ ...gesture, events: [...gesture.events, gesture.events[1]] }], positions, 300)).toThrow();
  expect(() => analyze([{ ...gesture, injections: [] }], positions, 300)).toThrow();
  expect(() => analyze([gesture], [positions[0], { ...positions[1], at: 30 }], 300)).toThrow("Surface precedes injected delay");
});

test("tracking compares each surface with the latest received pointer position", () => {
  const continuous = { ...gesture, events: [gesture.events[0],
    { type: "pointermove", at: 20, x: 120, y: 100, buttons: 1 },
    { type: "pointermove", at: 40, x: 180, y: 110, buttons: 1 },
    gesture.events[2],
  ], injections: [{ start: 20, end: 20, requestedMs: 0 }] };
  const frames = [positions[0],
    { at: 30, point: { x: 60, y: 50, count: 256 } },
    { at: 40, point: { x: 110, y: 60, count: 256 } },
    { at: 100, point: { x: 130, y: 60, count: 256 } },
  ];
  const interrupted = { ...continuous, events: continuous.events.map((event, index) => index === 2 ? { ...event, buttons: 0 } : event) };
  expect(() => analyze([interrupted], frames, 0)).toThrow();
  expect(analyze([continuous], frames, 0).tracking[0]).toEqual([
    { at: 30, lagPx: 10 }, { at: 40, lagPx: 20 }, { at: 100, lagPx: 0 },
  ]);
});
