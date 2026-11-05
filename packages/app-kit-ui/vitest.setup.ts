import "@testing-library/jest-dom/vitest";

// happy-dom has no ResizeObserver; the detail panel's inset measurement needs one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
