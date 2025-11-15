// [EARS: VIS-002, VIS-004, SEEK-001, SEEK-002, SEEK-003, SEEK-004]
// Waveform sparkline visualization with playhead and seek functionality

import React, { useRef, useEffect, useState } from 'react';

export interface WaveformProps {
  data?: number[];
  currentTime?: number;
  duration?: number;
  trackDuration?: number; // Actual duration of this track (for scaling)
  onSeek?: (time: number) => void;
  isPlaying?: boolean;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 60;
const WAVEFORM_COLOR = '#4caf50';
const PLAYHEAD_COLOR = '#ff6b6b';
const PLAYHEAD_WIDTH = 2;

/**
 * Waveform component displays audio waveform with playhead and seek controls
 * [EARS: VIS-002, VIS-004, SEEK-001, SEEK-002, SEEK-003, SEEK-004]
 */
export function Waveform({
  data: waveformData = [],
  currentTime = 0,
  duration = 0,
  trackDuration,
  onSeek,
  isPlaying = false,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Draw waveform sparkline on canvas
   * [EARS: VIS-002] Waveform visualization
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Handle empty or undefined data
    if (!waveformData || waveformData.length === 0) {
      return;
    }

    // Calculate waveform width based on track duration vs display duration
    // If trackDuration is provided and less than duration, scale the waveform
    const actualDuration = trackDuration || duration;
    const waveformWidth = duration > 0 ? (actualDuration / duration) * width : width;

    // Draw waveform
    ctx.strokeStyle = WAVEFORM_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const centerY = height / 2;
    const amplitudeScale = (height / 2) * 0.9; // 90% of half height

    // Draw each data point, scaled to waveformWidth
    waveformData.forEach((amplitude, index) => {
      const x = (index / (waveformData.length - 1 || 1)) * waveformWidth;
      const y = centerY - amplitude * amplitudeScale;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Draw mirror for symmetrical waveform
    for (let i = waveformData.length - 1; i >= 0; i--) {
      const amplitude = waveformData[i];
      const x = (i / (waveformData.length - 1 || 1)) * waveformWidth;
      const y = centerY + amplitude * amplitudeScale;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = WAVEFORM_COLOR + '40'; // 25% opacity
    ctx.fill();
    ctx.stroke();
  }, [waveformData, width, height, duration, trackDuration]);

  /**
   * Calculate time position from pixel position
   */
  const getTimeFromPosition = (clientX: number, element?: Element): number => {
    const targetElement = element || containerRef.current;
    if (!targetElement) return 0;

    const rect = targetElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, width));
    const ratio = clampedX / width;
    const time = ratio * duration;

    return time;
  };

  /**
   * Handle canvas click for seeking
   * [EARS: SEEK-001] Click-to-seek
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek) return;
    const time = getTimeFromPosition(e.clientX, e.currentTarget);
    onSeek(time);
  };

  /**
   * Handle playhead drag start
   * [EARS: SEEK-002] Drag-to-seek
   */
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Handle mouse move during drag
   * [EARS: SEEK-002, SEEK-003] Drag-to-seek and seek during playback
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !onSeek) return;

      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, duration, width, onSeek]);

  /**
   * Calculate playhead position
   * [EARS: VIS-004, SEEK-004] Playhead indicator
   */
  const playheadPosition = duration > 0 ? (currentTime / duration) * width : 0;

  return (
    <div
      ref={containerRef}
      className="waveform"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {/* Waveform Canvas */}
      {/* [EARS: VIS-002] Sparkline visualization */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        role="img"
        aria-label="Waveform visualization"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Playhead Indicator */}
      {/* [EARS: VIS-004, SEEK-004] Playhead vertical line */}
      <div
        data-testid="waveform-playhead"
        onMouseDown={handlePlayheadMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          left: `${playheadPosition}px`,
          width: `${PLAYHEAD_WIDTH}px`,
          height: '100%',
          backgroundColor: PLAYHEAD_COLOR,
          cursor: 'ew-resize',
          pointerEvents: 'auto',
          zIndex: 10,
        }}
      />
    </div>
  );
}
