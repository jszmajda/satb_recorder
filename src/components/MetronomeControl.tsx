// [EARS: MET-002, MET-003, MET-005, OVER-001] Metronome control with BPM and visual feedback

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useMetronome } from '../contexts/MetronomeContext';

const MIN_BPM = 40;
const MAX_BPM = 240;
const FLASH_DURATION = 100; // milliseconds

export function MetronomeControl() {
  const [bpm, setBpm] = useState(120);

  // [EARS: OVER-001] Use global project store for overdub state
  const overdubEnabled = useProjectStore((state) => state.currentProject?.overdubEnabled ?? false);
  const setOverdubEnabled = useProjectStore((state) => state.setOverdubEnabled);

  // Get shared metronome instance from context
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
     * [EARS: MET-005] Flash indicator on each beat
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

  /**
   * Update metronome BPM when bpm state changes
   * [EARS: MET-003] Sync BPM with metronome instance
   */
  useEffect(() => {
    const metronome = getMetronome();
    if (metronome) {
      metronome.setBpm(bpm);
    }
  }, [bpm, getMetronome]);

  /**
   * Handle BPM input change
   * [EARS: MET-003] Allow user to edit BPM directly
   */
  const handleBPMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value, 10);

    if (value === '' || isNaN(numValue)) {
      // Allow empty input during editing
      return;
    }

    // Clamp to valid range
    const clampedValue = Math.max(MIN_BPM, Math.min(MAX_BPM, numValue));
    setBpm(clampedValue);
  };

  /**
   * Handle BPM input blur
   * [EARS: MET-003] Restore valid BPM if input is invalid
   */
  const handleBPMBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value, 10);

    if (value === '' || isNaN(numValue)) {
      // Revert to current BPM if invalid
      e.target.value = bpm.toString();
      return;
    }

    // Clamp to valid range
    const clampedValue = Math.max(MIN_BPM, Math.min(MAX_BPM, numValue));
    if (clampedValue !== numValue) {
      setBpm(clampedValue);
    }
  };

  /**
   * Increment BPM
   * [EARS: MET-002] Increase BPM by 1
   */
  const handleIncrement = () => {
    if (bpm < MAX_BPM) {
      setBpm(bpm + 1);
    }
  };

  /**
   * Decrement BPM
   * [EARS: MET-002] Decrease BPM by 1
   */
  const handleDecrement = () => {
    if (bpm > MIN_BPM) {
      setBpm(bpm - 1);
    }
  };

  /**
   * Toggle overdub mode
   * [EARS: OVER-001] Enable/disable overdub
   */
  const handleOverdubToggle = async () => {
    await setOverdubEnabled(!overdubEnabled);
  };

  return (
    <>
      {/* CSS for metronome flash - using data attribute to survive React re-renders */}
      <style>{`
        [data-testid="metronome-flash"] {
          background-color: #444;
        }
        [data-testid="metronome-flash"][data-flashing="true"] {
          background-color: #4caf50;
        }
      `}</style>

      <div
        className="metronome-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#2c2c2c',
          border: '1px solid #444',
          borderRadius: '4px',
        }}
      >
        {/* Visual Flash Indicator */}
        {/* [EARS: MET-005] Visual feedback for metronome beats */}
        <div
          ref={flashElementRef}
          data-testid="metronome-flash"
          data-flashing="false"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '3px',
            transition: 'background-color 0.05s ease',
            border: '1px solid #666',
          }}
        />

      {/* BPM Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {/* Decrement Button */}
        {/* [EARS: MET-002] Decrease BPM */}
        <button
          onClick={handleDecrement}
          disabled={bpm <= MIN_BPM}
          aria-label="Decrement BPM"
          style={{
            padding: '0.3rem 0.5rem',
            backgroundColor: bpm <= MIN_BPM ? '#666' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: bpm <= MIN_BPM ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          }}
        >
          -
        </button>

        {/* BPM Input */}
        {/* [EARS: MET-003] Editable BPM field */}
        <input
          type="number"
          value={bpm}
          onChange={handleBPMChange}
          onBlur={handleBPMBlur}
          min={MIN_BPM}
          max={MAX_BPM}
          aria-label="BPM"
          style={{
            width: '55px',
            padding: '0.3rem',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: '#444',
            color: '#fff',
            border: '1px solid #666',
            borderRadius: '3px',
          }}
        />

        <span style={{ color: '#888', fontSize: '0.75rem' }}>BPM</span>

        {/* Increment Button */}
        {/* [EARS: MET-002] Increase BPM */}
        <button
          onClick={handleIncrement}
          disabled={bpm >= MAX_BPM}
          aria-label="Increment BPM"
          style={{
            padding: '0.3rem 0.5rem',
            backgroundColor: bpm >= MAX_BPM ? '#666' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: bpm >= MAX_BPM ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          }}
        >
          +
        </button>
      </div>

      {/* Overdub Toggle */}
      {/* [EARS: OVER-001] Toggle overdub mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.5rem' }}>
        <input
          type="checkbox"
          checked={overdubEnabled}
          onChange={handleOverdubToggle}
          id="overdub-toggle"
          aria-label="Overdub mode"
          style={{
            width: '16px',
            height: '16px',
            cursor: 'pointer',
          }}
        />
        <label
          htmlFor="overdub-toggle"
          style={{
            color: '#fff',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Overdub
        </label>
      </div>
    </div>
    </>
  );
}
