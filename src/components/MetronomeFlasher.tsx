// Large metronome visual flasher component
// Uses data attributes + CSS for timing-critical updates (see docs/RENDERING_PERFORMANCE.md)

import { useEffect, useRef } from 'react';
import { useMetronome } from '../contexts/MetronomeContext';

const FLASH_DURATION = 100; // milliseconds

/**
 * MetronomeFlasher - Large visual indicator for metronome beats
 * Uses data attributes + CSS pattern to bypass React state batching
 */
export function MetronomeFlasher() {
  const { getMetronome } = useMetronome();
  const flashTimeoutRef = useRef<number | null>(null);
  const flashElementRef = useRef<HTMLDivElement | null>(null);

  /**
   * Set up visual callback on shared metronome
   * [EARS: MET-005] Flash indicator on each beat
   */
  useEffect(() => {
    const metronome = getMetronome();
    if (!metronome) return;

    /**
     * Visual callback for metronome beats
     * Uses data attribute to trigger CSS change (survives React re-renders)
     */
    const handleVisualCallback = () => {
      const element = flashElementRef.current;
      if (!element) return;

      // Use dataset attribute to trigger CSS change (survives React re-renders)
      element.dataset.flashing = 'true';

      // Clear flash after duration
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = window.setTimeout(() => {
        if (element) {
          element.dataset.flashing = 'false';
        }
      }, FLASH_DURATION);
    };

    metronome.setVisualCallback(handleVisualCallback);

    // Cleanup on unmount
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [getMetronome]);

  return (
    <>
      {/* CSS for metronome flash - using data attribute to survive React re-renders */}
      <style>{`
        [data-testid="metronome-flasher-large"] {
          background-color: #1a1a1a;
        }
        [data-testid="metronome-flasher-large"][data-flashing="true"] {
          background-color: #4caf50;
        }
      `}</style>

      <div
        ref={flashElementRef}
        data-testid="metronome-flasher-large"
        data-flashing="false"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '4px',
          transition: 'background-color 0.05s ease',
          border: '2px solid #333',
        }}
      />
    </>
  );
}
