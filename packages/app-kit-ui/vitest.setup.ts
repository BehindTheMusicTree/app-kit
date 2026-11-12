import "@testing-library/jest-dom/vitest";

// happy-dom has no ResizeObserver; the detail panel's inset measurement needs one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom has no matchMedia; the animated region globe subscribes to prefers-reduced-motion.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
})) as unknown as typeof window.matchMedia;
