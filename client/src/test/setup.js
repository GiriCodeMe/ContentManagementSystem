import "@testing-library/jest-dom";

// jsdom does not implement IntersectionObserver
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
