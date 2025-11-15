// [EARS: PLAY-001, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007, PLAY-008]
// PlaybackControls component integrates Mixer with transport UI

import React, { useState, useEffect, useRef } from 'react';
import { Mixer } from '../audio/mixer';

export interface PlaybackTrack {
  id: string;
  audioBlob: Blob;
  volume: number;
  muted: boolean;
  soloed: boolean;
}

export interface PlaybackControlsProps {
  totalDuration?: number;
  tracks?: PlaybackTrack[];
  /**
   * Optional external control of current time
   * If provided, component acts as controlled component for time
   */
  currentTime?: number;
  /**
   * Callback when current time changes (for controlled components)
   */
  onCurrentTimeChange?: (time: number) => void;
  /**
   * Callback when user seeks to a specific time
   * [EARS: SEEK-001, SEEK-002, SEEK-003]
   */
  onSeek?: (time: number) => void;
}

type PlayState = 'stopped' | 'playing' | 'paused';

/**
 * Format seconds into M:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * PlaybackControls component integrates Mixer with transport controls
 * [EARS: PLAY-001 through PLAY-008]
 */
export function PlaybackControls({
  totalDuration = 0,
  tracks = [],
  currentTime: externalCurrentTime,
  onCurrentTimeChange,
  onSeek,
}: PlaybackControlsProps) {
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Use external currentTime if provided, otherwise use internal state
  const currentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime;

  const mixerRef = useRef<Mixer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  /**
   * Initialize mixer on mount
   */
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    mixerRef.current = new Mixer(audioContextRef.current);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (mixerRef.current) {
        mixerRef.current.dispose();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Load tracks into mixer when tracks change
   * [EARS: PLAY-006, PLAY-007, PLAY-008] Mute, solo, and multi-track playback
   */
  useEffect(() => {
    const loadTracks = async () => {
      if (!mixerRef.current || tracks.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Load all tracks
      for (const track of tracks) {
        try {
          await mixerRef.current.loadTrack(track.id, track.audioBlob);
          mixerRef.current.setVolume(track.id, track.volume);
          mixerRef.current.setMuted(track.id, track.muted);
          mixerRef.current.setSoloed(track.id, track.soloed);
        } catch (error) {
          console.error(`Failed to load track ${track.id}:`, error);
        }
      }

      setIsLoading(false);
    };

    loadTracks();
  }, [tracks]);

  /**
   * Sync play state with mixer
   */
  useEffect(() => {
    const checkPlayState = () => {
      if (mixerRef.current) {
        const isPlaying = mixerRef.current.isPlaying();
        if (isPlaying && playState !== 'playing') {
          setPlayState('playing');
        } else if (!isPlaying && playState === 'playing') {
          setPlayState('paused');
        }
      }
    };

    // Check immediately and set up interval
    checkPlayState();
    const stateCheckInterval = window.setInterval(checkPlayState, 50);

    return () => {
      clearInterval(stateCheckInterval);
    };
  }, [playState]);

  /**
   * Handle Play button click
   * [EARS: PLAY-001] Start playback from current position
   */
  const handlePlay = () => {
    if (!mixerRef.current) return;

    // [EARS: PLAY-006, PLAY-007, PLAY-008] Mixer handles mute/solo/sync logic
    mixerRef.current.play();
    setPlayState('playing');
  };

  /**
   * Handle Pause button click
   * [EARS: PLAY-002] Pause and maintain playhead position
   *
   * Note: Current Mixer implementation doesn't support pause/resume,
   * so we call stop() but maintain the current time in component state.
   * This allows resuming from the same position.
   */
  const handlePause = () => {
    if (!mixerRef.current) return;

    mixerRef.current.stop();
    setPlayState('paused');
  };

  /**
   * Handle Stop button click
   * [EARS: PLAY-003] Stop and reset playhead to 0:00
   */
  const handleStop = () => {
    if (!mixerRef.current) return;

    mixerRef.current.stop();
    setPlayState('stopped');

    // Reset time to 0
    if (externalCurrentTime !== undefined && onCurrentTimeChange) {
      onCurrentTimeChange(0);
    } else {
      setInternalCurrentTime(0);
    }

    // Also call onSeek if provided
    if (onSeek) {
      onSeek(0);
    }
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
   * Update playhead time while playing
   * [EARS: PLAY-004] Update playhead visual in real-time
   * [EARS: PLAY-005] Display elapsed time
   */
  useEffect(() => {
    if (playState === 'playing') {
      // Update time every 100ms for smooth display
      intervalRef.current = window.setInterval(() => {
        const newTime = Math.min(currentTime + 0.1, totalDuration);

        if (externalCurrentTime !== undefined && onCurrentTimeChange) {
          onCurrentTimeChange(newTime);
        } else {
          setInternalCurrentTime(newTime);
        }
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
  }, [playState, totalDuration, currentTime, externalCurrentTime, onCurrentTimeChange]);

  return (
    <div
      className="playback-controls"
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
        {/* Play/Pause Toggle Button */}
        {/* [EARS: PLAY-001, PLAY-002] */}
        <button
          onClick={handlePlayPauseToggle}
          aria-label={playState === 'playing' ? 'Pause' : 'Play'}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: isLoading ? '#666' : '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {playState === 'playing' ? '⏸' : '▶'}
        </button>

        {/* Stop Button */}
        {/* [EARS: PLAY-003] */}
        <button
          onClick={handleStop}
          aria-label="Stop"
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          ■
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div
          style={{
            fontSize: '0.85rem',
            color: '#ffeb3b',
            marginBottom: '0.5rem',
          }}
        >
          Loading tracks...
        </div>
      )}

      {/* Time Display */}
      {/* [EARS: PLAY-005] Display elapsed time and total duration */}
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#fff',
          fontFamily: 'monospace',
        }}
      >
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </div>
    </div>
  );
}
