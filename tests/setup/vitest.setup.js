// tests/setup/vitest.setup.js
import { vi, beforeEach, afterEach } from 'vitest';
import { config } from '@vue/test-utils';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

// Mock location
const locationMock = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn()
};

// Mock navigator
const navigatorMock = {
  userAgent: 'Mozilla/5.0 (Test Environment)',
  language: 'en-US',
  languages: ['en-US', 'en'],
  platform: 'Test'
};

// Global setup before each test
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  // Setup sessionStorage mock
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
  });

  // Setup location mock
  Object.defineProperty(window, 'location', {
    value: locationMock,
    writable: true
  });

  // Setup navigator mock
  Object.defineProperty(window, 'navigator', {
    value: navigatorMock,
    writable: true
  });

  // Reset localStorage and sessionStorage state
  localStorage.clear();
  sessionStorage.clear();
  localStorage.length = 0;
  sessionStorage.length = 0;

  // Setup localStorage getItem to return actual stored values
  const localStorageStore = {};
  localStorage.getItem.mockImplementation((key) => {
    return localStorageStore[key] || null;
  });
  localStorage.setItem.mockImplementation((key, value) => {
    localStorageStore[key] = value;
    localStorage.length = Object.keys(localStorageStore).length;
  });
  localStorage.removeItem.mockImplementation((key) => {
    delete localStorageStore[key];
    localStorage.length = Object.keys(localStorageStore).length;
  });
  localStorage.clear.mockImplementation(() => {
    Object.keys(localStorageStore).forEach(key => {
      delete localStorageStore[key];
    });
    localStorage.length = 0;
  });

  // Setup sessionStorage with similar store
  const sessionStorageStore = {};
  sessionStorage.getItem.mockImplementation((key) => {
    return sessionStorageStore[key] || null;
  });
  sessionStorage.setItem.mockImplementation((key, value) => {
    sessionStorageStore[key] = value;
    sessionStorage.length = Object.keys(sessionStorageStore).length;
  });
  sessionStorage.removeItem.mockImplementation((key) => {
    delete sessionStorageStore[key];
    sessionStorage.length = Object.keys(sessionStorageStore).length;
  });
  sessionStorage.clear.mockImplementation(() => {
    Object.keys(sessionStorageStore).forEach(key => {
      delete sessionStorageStore[key];
    });
    sessionStorage.length = 0;
  });

  // Mock crypto for UUID generation
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
      getRandomValues: vi.fn(() => new Uint32Array(1))
    }
  });

  // Mock performance.now
  Object.defineProperty(global, 'performance', {
    value: {
      now: vi.fn(() => Date.now())
    }
  });

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
  global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn()
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn()
  }));

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock scrollTo
  window.scrollTo = vi.fn();

  // Mock alert/confirm for tests
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
});

// Cleanup after each test
afterEach(() => {
  // Clean up any timers
  vi.clearAllTimers();

  // Reset location
  locationMock.href = 'http://localhost:3000';
  locationMock.pathname = '/';
  locationMock.search = '';
  locationMock.hash = '';
});

// Configure Vue Test Utils
config.global.mocks = {
  $t: (key) => key,
  $i18n: {
    locale: 'es',
    t: (key) => key
  }
};

// Ignore certain warnings in test environment
config.global.stubs = {
  'transition': true,
  'transition-group': true,
  'router-link': true,
  'router-view': true
};

// Mock environment variables
vi.mock('@/env', () => ({
  VITE_API_BASE_URL: 'http://localhost:5173/api',
  VITE_APP_NAME: 'RapiFirma Test'
}));

console.log('✅ Vitest setup initialized');