import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let onPlayPause: any;
  let onUndo: any;

  beforeEach(() => {
    onPlayPause = vi.fn();
    onUndo = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Space bar - Play/Pause toggle', () => {
    test('calls onPlayPause when Space is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      const event = new KeyboardEvent('keydown', { key: ' ' });
      document.dispatchEvent(event);

      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    test('does not call onPlayPause when Space is pressed with modifiers', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      // Space + Ctrl
      const event1 = new KeyboardEvent('keydown', { key: ' ', ctrlKey: true });
      document.dispatchEvent(event1);

      // Space + Shift
      const event2 = new KeyboardEvent('keydown', { key: ' ', shiftKey: true });
      document.dispatchEvent(event2);

      // Space + Alt
      const event3 = new KeyboardEvent('keydown', { key: ' ', altKey: true });
      document.dispatchEvent(event3);

      expect(onPlayPause).not.toHaveBeenCalled();
    });

    test('does not call onPlayPause when Space is pressed in input field', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      // Create a fake input element
      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
      });

      Object.defineProperty(event, 'target', {
        writable: false,
        value: input,
      });

      document.dispatchEvent(event);

      expect(onPlayPause).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    test('does not call onPlayPause when Space is pressed in textarea', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const event = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
      });

      Object.defineProperty(event, 'target', {
        writable: false,
        value: textarea,
      });

      document.dispatchEvent(event);

      expect(onPlayPause).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });
  });

  describe('Ctrl+Z/Cmd+Z - Undo delete (TRACK-003)', () => {
    test('calls onUndo when Ctrl+Z is pressed (Windows/Linux)', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      document.dispatchEvent(event);

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    test('calls onUndo when Cmd+Z is pressed (Mac)', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
      });
      document.dispatchEvent(event);

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    test('calls onUndo when uppercase Z with Ctrl is pressed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Z',
        ctrlKey: true,
      });
      document.dispatchEvent(event);

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    test('does not call onUndo when Z is pressed without modifier', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      const event = new KeyboardEvent('keydown', { key: 'z' });
      document.dispatchEvent(event);

      expect(onUndo).not.toHaveBeenCalled();
    });

    test('does not call onUndo when Ctrl+Z is pressed in input field', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', {
        writable: false,
        value: input,
      });

      document.dispatchEvent(event);

      expect(onUndo).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('Hook lifecycle', () => {
    test('registers event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    test('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    test('does not crash when callbacks are not provided', () => {
      renderHook(() => useKeyboardShortcuts({}));

      // Space
      const event1 = new KeyboardEvent('keydown', { key: ' ' });
      expect(() => document.dispatchEvent(event1)).not.toThrow();

      // Ctrl+Z
      const event2 = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
      expect(() => document.dispatchEvent(event2)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    test('handles multiple Space presses', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      for (let i = 0; i < 5; i++) {
        const event = new KeyboardEvent('keydown', { key: ' ' });
        document.dispatchEvent(event);
      }

      expect(onPlayPause).toHaveBeenCalledTimes(5);
    });

    test('handles multiple Ctrl+Z presses', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      for (let i = 0; i < 3; i++) {
        const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
        document.dispatchEvent(event);
      }

      expect(onUndo).toHaveBeenCalledTimes(3);
    });

    test('does not interfere with other key presses', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onPlayPause,
          onUndo,
        })
      );

      // Press various other keys
      const keys = ['a', 'Enter', 'Escape', 'ArrowUp', 'Tab'];
      keys.forEach((key) => {
        const event = new KeyboardEvent('keydown', { key });
        document.dispatchEvent(event);
      });

      expect(onPlayPause).not.toHaveBeenCalled();
      expect(onUndo).not.toHaveBeenCalled();
    });
  });
});
