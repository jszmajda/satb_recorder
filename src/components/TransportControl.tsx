// [EARS: PLAY-001, PLAY-002, PLAY-003, PLAY-005] Transport controls for playback

import { useState, useEffect, useRef } from 'react';

type PlayState = 'stopped' | 'playing' | 'paused';

/**
 * Format seconds into M:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TransportControl() {
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration] = useState(0); // Will be populated when tracks are integrated

  const intervalRef = useRef<number | null>(null);

  /**
   * Handle Play button click
   * [EARS: PLAY-001] Start playback from current position
   */
  const handlePlay = () => {
    setPlayState('playing');
  };

  /**
   * Handle Pause button click
   * [EARS: PLAY-002] Pause and maintain playhead position
   */
  const handlePause = () => {
    setPlayState('paused');
  };

  /**
   * Handle Stop button click
   * [EARS: PLAY-003] Stop and reset playhead to 0:00
   */
  const handleStop = () => {
    setPlayState('stopped');
    setCurrentTime(0);
  };

  /**
   * Handle Play/Pause toggle button click
   */
  const handlePlayPauseToggle = () => {
    if (playState === 'playing') {
      handlePause();
    } else {
      handlePlay();
    }
  };

  /**
   * Start/stop time updates based on play state
   * [EARS: PLAY-005] Update elapsed time display
   */
  useEffect(() => {
    if (playState === 'playing') {
      // Update time every 100ms for smooth display
      intervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => prev + 0.1);
      }, 100);
    } else {
      // Clear interval when paused or stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playState]);

  return (
    <div
      className="transport-control"
      style={{
        padding: '1rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '8px',
      }}
    >
      {/* Transport Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPauseToggle}
          aria-label={playState === 'playing' ? 'Pause' : 'Play'}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: playState === 'playing' ? '#ffb74d' : '#4caf50',
            color: '#000',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            minWidth: '80px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = playState === 'playing' ? '#ffa726' : '#66bb6a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = playState === 'playing' ? '#ffb74d' : '#4caf50';
          }}
        >
          {playState === 'playing' ? '⏸' : '▶'}
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStop}
          disabled={playState === 'stopped'}
          aria-label="Stop"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: playState === 'stopped' ? '#333' : '#f44336',
            color: playState === 'stopped' ? '#666' : '#fff',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: playState === 'stopped' ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            minWidth: '80px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (playState !== 'stopped') {
              e.currentTarget.style.backgroundColor = '#ef5350';
            }
          }}
          onMouseLeave={(e) => {
            if (playState !== 'stopped') {
              e.currentTarget.style.backgroundColor = '#f44336';
            }
          }}
        >
          ⏹
        </button>
      </div>

      {/* Time Display */}
      {/* [EARS: PLAY-005] Display elapsed time and total duration */}
      <div
        style={{
          fontSize: '1.5rem',
          fontFamily: 'monospace',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </div>
    </div>
  );
}
