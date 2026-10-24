import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// React 19 needs this flag when act() is used outside the test renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});

/** jsdom has no layout engine; Recharts and Radix only need the observer shape. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    value: ResizeObserverStub,
  });
}

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no WebGL/2D canvas implementation. The app probes for WebGL and
// falls back gracefully; returning null keeps test output clean.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

if (!globalThis.URL.createObjectURL) {
  Object.defineProperty(globalThis.URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:dataspace-test"),
  });
}

if (!globalThis.URL.revokeObjectURL) {
  Object.defineProperty(globalThis.URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  });
}
