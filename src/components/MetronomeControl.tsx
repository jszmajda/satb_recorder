// [EARS: MET-002, MET-003, MET-005, OVER-001] Metronome control with BPM and visual feedback

import { useState, useEffect, useRef } from 'react';
import { Metronome } from '../audio/metronome';

const MIN_BPM = 40;
const MAX_BPM = 240;
const FLASH_DURATION = 100; // milliseconds

export function MetronomeControl() {
  const [bpm, setBpm] = useState(120);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isBeatOne, setIsBeatOne] = useState(false);
  const [overdubEnabled, setOverdubEnabled] = useState(false);

  const metronomeRef = useRef<Metronome | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  /**
   * Initialize metronome on mount
   * [EARS: MET-003] Set up metronome with default BPM
   */
  useEffect(() => {
    metronomeRef.current = new Metronome(bpm);

    /**
     * Visual callback for metronome beats
     * [EARS: MET-005] Flash indicator on each beat
     */
    const handleVisualCallback = (beatNumber: number) => {
      setIsFlashing(true);
      setIsBeatOne(beatNumber === 1);

      // Clear flash after duration
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = window.setTimeout(() => {
        setIsFlashing(false);
        setIsBeatOne(false);
      }, FLASH_DURATION);
    };

    metronomeRef.current.setVisualCallback(handleVisualCallback);

    // Cleanup on unmount
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      if (metronomeRef.current) {
        metronomeRef.current.dispose();
      }
    };
  }, []);

  /**
   * Update metronome BPM when bpm state changes
   * [EARS: MET-003] Sync BPM with metronome instance
   */
  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setBpm(bpm);
    }
  }, [bpm]);

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
  const handleOverdubToggle = () => {
    setOverdubEnabled(!overdubEnabled);
  };

  return (
    <div
      className="metronome-control"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '8px',
      }}
    >
      {/* Visual Flash Indicator */}
      {/* [EARS: MET-005] Visual feedback for metronome beats */}
      <div
        data-testid="metronome-flash"
        className={`${isFlashing ? 'flash-active' : ''} ${isBeatOne ? 'beat-one' : ''}`}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          backgroundColor: isFlashing ? (isBeatOne ? '#ff6b6b' : '#4caf50') : '#444',
          transition: 'background-color 0.05s ease',
          border: '2px solid #666',
        }}
      />

      {/* BPM Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Decrement Button */}
        {/* [EARS: MET-002] Decrease BPM */}
        <button
          onClick={handleDecrement}
          disabled={bpm <= MIN_BPM}
          aria-label="Decrement BPM"
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: bpm <= MIN_BPM ? '#666' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: bpm <= MIN_BPM ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2rem',
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
            width: '70px',
            padding: '0.5rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: '#444',
            color: '#fff',
            border: '1px solid #666',
            borderRadius: '4px',
          }}
        />

        <span style={{ color: '#888', fontSize: '0.9rem' }}>BPM</span>

        {/* Increment Button */}
        {/* [EARS: MET-002] Increase BPM */}
        <button
          onClick={handleIncrement}
          disabled={bpm >= MAX_BPM}
          aria-label="Increment BPM"
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: bpm >= MAX_BPM ? '#666' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: bpm >= MAX_BPM ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2rem',
          }}
        >
          +
        </button>
      </div>

      {/* Overdub Toggle */}
      {/* [EARS: OVER-001] Toggle overdub mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
        <input
          type="checkbox"
          checked={overdubEnabled}
          onChange={handleOverdubToggle}
          id="overdub-toggle"
          aria-label="Overdub mode"
          style={{
            width: '20px',
            height: '20px',
            cursor: 'pointer',
          }}
        />
        <label
          htmlFor="overdub-toggle"
          style={{
            color: '#fff',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Overdub
        </label>
      </div>
    </div>
  );
}
