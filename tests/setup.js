import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Deterministic dates in every environment
process.env.TZ = 'UTC';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom lacks these; recharts / the theme context use them
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  }));

window.alert = vi.fn();
window.confirm = vi.fn(() => true);
