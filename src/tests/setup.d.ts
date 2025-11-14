import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { expect } from 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
}
