// [EARS: MIC-005, REC-004, VIS-003] VU meter component for real-time audio level display

import React, { useState, useEffect, useRef } from 'react';

export interface VUMeterProps {
  level: number; // 0-1 normalized level
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 30;
const PEAK_DECAY_TIME = 1500; // milliseconds

/**
 * VUMeter component displays real-time audio levels
 * [EARS: MIC-005, REC-004, VIS-003]
 */
export function VUMeter({
  level,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: VUMeterProps) {
  const [peakLevel, setPeakLevel] = useState(0);
  const peakTimeoutRef = useRef<number | null>(null);

  // Clamp level to 0-1 range
  const clampedLevel = Math.max(0, Math.min(1, level));

  /**
   * Update peak level and decay timer
   * [EARS: VIS-003] Peak indicator holds maximum value
   */
  useEffect(() => {
    if (clampedLevel > peakLevel) {
      // New peak - update immediately
      setPeakLevel(clampedLevel);

      // Clear existing decay timeout
      if (peakTimeoutRef.current) {
        clearTimeout(peakTimeoutRef.current);
      }

      // Set new decay timeout
      peakTimeoutRef.current = window.setTimeout(() => {
        setPeakLevel(clampedLevel);
      }, PEAK_DECAY_TIME);
    }

    // Cleanup on unmount
    return () => {
      if (peakTimeoutRef.current) {
        clearTimeout(peakTimeoutRef.current);
      }
    };
  }, [clampedLevel, peakLevel]);

  /**
   * Get color class based on level
   * [EARS: VIS-003] Color coding: green (low), yellow (medium), red (high)
   */
  const getColorClass = (levelValue: number): string => {
    if (levelValue >= 0.9) return 'level-high';
    if (levelValue >= 0.7) return 'level-medium';
    return 'level-low';
  };

  // Convert to percentage for display
  const fillPercent = clampedLevel * 100;
  const peakPercent = peakLevel * 100;
  const ariaValue = Math.round(fillPercent);

  return (
    <div
      className="vu-meter"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* VU Meter Container */}
      <div
        role="meter"
        aria-label="VU Meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaValue}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Level Fill */}
        {/* [EARS: MIC-005, REC-004] Real-time level visualization */}
        <div
          data-testid="vu-meter-fill"
          className={getColorClass(clampedLevel)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${fillPercent}%`,
            height: '100%',
            backgroundColor: clampedLevel >= 0.9 ? '#f44336' : clampedLevel >= 0.7 ? '#ff9800' : '#4caf50',
            transition: 'width 0.05s ease-out, background-color 0.1s ease',
          }}
        />

        {/* Peak Indicator */}
        {/* [EARS: VIS-003] Peak hold indicator */}
        <div
          data-testid="vu-meter-peak"
          style={{
            position: 'absolute',
            top: 0,
            left: `${peakPercent}%`,
            width: '2px',
            height: '100%',
            backgroundColor: '#fff',
            boxShadow: '0 0 4px rgba(255,255,255,0.8)',
            transition: 'left 0.05s ease-out',
            zIndex: 10,
          }}
        />
      </div>
    </div>
  );
}
