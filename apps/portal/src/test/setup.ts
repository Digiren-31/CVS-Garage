import '@testing-library/jest-dom/vitest';

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
