import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  })
});

class ResizeObserverStub implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    void callback;
  }
  observe(target: Element, options?: ResizeObserverOptions) {
    void target;
    void options;
  }
  unobserve(target: Element) {
    void target;
  }
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub;

class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    void callback;
    void options;
  }

  observe(target: Element) {
    void target;
  }

  unobserve(target: Element) {
    void target;
  }

  disconnect() {}

  takeRecords() {
    return [];
  }
}

globalThis.IntersectionObserver = IntersectionObserverStub;
