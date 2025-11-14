import { useEffect } from 'react';

export interface UseKeyboardShortcutsOptions {
  /**
   * Callback for Space bar - Play/Pause toggle
   */
  onPlayPause?: () => void;

  /**
   * Callback for Ctrl+Z/Cmd+Z - Undo delete
   * [EARS: TRACK-003] Restore last deleted track
   */
  onUndo?: () => void;
}

/**
 * Custom hook to handle global keyboard shortcuts
 *
 * Implements:
 * - Space bar: Play/Pause toggle
 * - Ctrl+Z (Cmd+Z on Mac): Undo last deleted track [EARS: TRACK-003]
 *
 * Shortcuts are disabled when typing in input fields or textareas
 */
export function useKeyboardShortcuts({
  onPlayPause,
  onUndo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Get the target element
      const target = event.target as HTMLElement;
      const tagName = target.tagName;

      // Don't trigger shortcuts when typing in input fields or textareas
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        return;
      }

      // Space bar - Play/Pause toggle
      if (event.key === ' ' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        onPlayPause?.();
        return;
      }

      // Ctrl+Z or Cmd+Z - Undo delete [EARS: TRACK-003]
      if (
        (event.key === 'z' || event.key === 'Z') &&
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        onUndo?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onPlayPause, onUndo]);
}
