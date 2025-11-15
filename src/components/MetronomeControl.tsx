// [EARS: MET-002, MET-003, OVER-001] Metronome control with BPM

import { useState, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useMetronome } from '../contexts/MetronomeContext';

const MIN_BPM = 40;
const MAX_BPM = 240;

export function MetronomeControl() {
  // [EARS: OVER-001] Use global project store for overdub state
  const currentProject = useProjectStore((state) => state.currentProject);
  const overdubEnabled = useProjectStore((state) => state.currentProject?.overdubEnabled ?? false);
  const setOverdubEnabled = useProjectStore((state) => state.setOverdubEnabled);
  const updateBpm = useProjectStore((state) => state.updateBpm);

  // Local state for BPM (synced with project)
  const [bpm, setBpm] = useState(120);

  // Get shared metronome instance from context
  const { getMetronome } = useMetronome();

  /**
   * Initialize BPM from project when project loads
   */
  useEffect(() => {
    if (currentProject) {
      setBpm(currentProject.bpm);
    }
  }, [currentProject?.id]); // Only update when project changes

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

    // Set value directly without clamping to allow typing
    setBpm(numValue);
  };

  /**
   * Handle BPM input blur
   * [EARS: MET-003] Restore valid BPM if input is invalid
   * [EARS: PROJ-005] Auto-save BPM to project
   */
  const handleBPMBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
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

    // Save to project store
    if (currentProject) {
      await updateBpm(clampedValue);
    }
  };

  /**
   * Increment BPM
   * [EARS: MET-002] Increase BPM by 1
   * [EARS: PROJ-005] Auto-save BPM to project
   */
  const handleIncrement = async () => {
    if (bpm < MAX_BPM) {
      const newBpm = bpm + 1;
      setBpm(newBpm);
      if (currentProject) {
        await updateBpm(newBpm);
      }
    }
  };

  /**
   * Decrement BPM
   * [EARS: MET-002] Decrease BPM by 1
   * [EARS: PROJ-005] Auto-save BPM to project
   */
  const handleDecrement = async () => {
    if (bpm > MIN_BPM) {
      const newBpm = bpm - 1;
      setBpm(newBpm);
      if (currentProject) {
        await updateBpm(newBpm);
      }
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
  );
}
