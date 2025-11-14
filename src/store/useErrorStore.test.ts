// [EARS: ERR-001, ERR-002, ERR-003] Tests for global error state management

import { describe, test, expect, beforeEach } from 'vitest';
import { useErrorStore } from './useErrorStore';

describe('useErrorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useErrorStore.getState().clearError();
  });

  describe('Initial state', () => {
    test('starts with no error', () => {
      const error = useErrorStore.getState().error;
      expect(error).toBeNull();
    });
  });

  describe('setError', () => {
    test('sets error message', () => {
      useErrorStore.getState().setError('Test error');
      const error = useErrorStore.getState().error;
      expect(error).toBe('Test error');
    });

    test('can set different error messages', () => {
      useErrorStore.getState().setError('First error');
      expect(useErrorStore.getState().error).toBe('First error');

      useErrorStore.getState().setError('Second error');
      expect(useErrorStore.getState().error).toBe('Second error');
    });

    test('can set error to null', () => {
      useErrorStore.getState().setError('Error');
      useErrorStore.getState().setError(null);
      expect(useErrorStore.getState().error).toBeNull();
    });
  });

  describe('clearError', () => {
    test('clears existing error', () => {
      useErrorStore.getState().setError('Test error');
      useErrorStore.getState().clearError();
      expect(useErrorStore.getState().error).toBeNull();
    });

    test('does nothing when no error exists', () => {
      useErrorStore.getState().clearError();
      expect(useErrorStore.getState().error).toBeNull();
    });

    test('can clear error multiple times', () => {
      useErrorStore.getState().setError('Error');
      useErrorStore.getState().clearError();
      useErrorStore.getState().clearError();
      expect(useErrorStore.getState().error).toBeNull();
    });
  });

  describe('EARS error scenarios', () => {
    test('handles microphone permission denied error (ERR-001)', () => {
      useErrorStore.getState().setError('Microphone permission denied');
      expect(useErrorStore.getState().error).toBe('Microphone permission denied');
    });

    test('handles storage quota exceeded error (ERR-002)', () => {
      useErrorStore.getState().setError('Storage quota exceeded');
      expect(useErrorStore.getState().error).toBe('Storage quota exceeded');
    });

    test('handles recording failed error (ERR-003)', () => {
      useErrorStore.getState().setError('Recording failed');
      expect(useErrorStore.getState().error).toBe('Recording failed');
    });

    test('handles generic errors', () => {
      useErrorStore.getState().setError('Something went wrong');
      expect(useErrorStore.getState().error).toBe('Something went wrong');
    });
  });

  describe('Error flow', () => {
    test('can set and clear multiple errors in sequence', () => {
      // Set first error
      useErrorStore.getState().setError('Error 1');
      expect(useErrorStore.getState().error).toBe('Error 1');

      // Clear it
      useErrorStore.getState().clearError();
      expect(useErrorStore.getState().error).toBeNull();

      // Set second error
      useErrorStore.getState().setError('Error 2');
      expect(useErrorStore.getState().error).toBe('Error 2');

      // Clear it
      useErrorStore.getState().clearError();
      expect(useErrorStore.getState().error).toBeNull();
    });
  });
});
