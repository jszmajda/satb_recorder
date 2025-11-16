// [EARS: PLAY-001, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007, PLAY-008]
// PlaybackControls component integrates Mixer with transport UI

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Mixer } from '../audio/mixer';
import { useMetronome } from '../contexts/MetronomeContext';
import { useMixer } from '../contexts/MixerContext';

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

/**
 * Methods exposed via ref for external control
 */
export interface PlaybackControlsHandle {
  togglePlayPause: () => void;
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
export const PlaybackControls = forwardRef<PlaybackControlsHandle, PlaybackControlsProps>(
  function PlaybackControls({
    totalDuration = 0,
    tracks = [],
    currentTime: externalCurrentTime,
    onCurrentTimeChange,
    onSeek,
  }, ref) {
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);

  // Use external currentTime if provided, otherwise use internal state
  const currentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime;

  // Get shared metronome instance from context
  const { getMetronome } = useMetronome();

  // Get shared mixer, audio context, and loading state from context
  const { getMixer, getAudioContext, isLoading, setIsLoading } = useMixer();
  const mixer = getMixer();
  const audioContext = getAudioContext();

  const intervalRef = useRef<number | null>(null);
  const loadedTrackIdsRef = useRef<Set<string>>(new Set());
  const lastInternalTimeRef = useRef<number>(0);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Note: Don't dispose mixer or close audioContext - they're shared
      loadedTrackIdsRef.current.clear();
    };
  }, []);

  /**
   * Load tracks into mixer when tracks change
   * [EARS: PLAY-006, PLAY-007, PLAY-008] Mute, solo, and multi-track playback
   */
  useEffect(() => {
    const loadTracks = async () => {
      if (!mixer) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Get current track IDs from props
      const currentTrackIds = new Set(tracks.map(t => t.id));

      // Unload tracks that are no longer in the list
      const tracksToUnload = Array.from(loadedTrackIdsRef.current).filter(id => !currentTrackIds.has(id));
      for (const trackId of tracksToUnload) {
        mixer.unloadTrack(trackId);
        loadedTrackIdsRef.current.delete(trackId);
      }

      // Load new tracks and update state for all tracks
      for (const track of tracks) {
        try {
          // Only load if not already loaded (to avoid re-decoding audio)
          if (!loadedTrackIdsRef.current.has(track.id)) {
            await mixer.loadTrack(track.id, track.audioBlob);
            loadedTrackIdsRef.current.add(track.id);
          }

          // Always update volume, mute, and solo state (cheap operations)
          mixer.setVolume(track.id, track.volume);
          mixer.setMuted(track.id, track.muted);
          mixer.setSoloed(track.id, track.soloed);
        } catch (error) {
          console.error(`Failed to load track ${track.id}:`, error);
        }
      }

      setIsLoading(false);
    };

    loadTracks();
  }, [tracks]);

  /**
   * Handle external seek events
   * [EARS: SEEK-001, SEEK-002, SEEK-003] Seek mixer when currentTime changes externally
   */
  useEffect(() => {
    if (!mixer) return;

    // Check if this is an external time change (not from our interval)
    const tolerance = 0.15; // Allow 150ms tolerance for interval updates
    const timeDiff = Math.abs(currentTime - lastInternalTimeRef.current);

    if (timeDiff > tolerance) {
      // This is an external seek - update the mixer
      mixer.seek(currentTime);
      lastInternalTimeRef.current = currentTime;
    }
  }, [currentTime]);

  /**
   * Sync play state with mixer
   */
  useEffect(() => {
    const checkPlayState = () => {
      if (mixer) {
        const isPlaying = mixer.isPlaying();
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
    if (!mixer) return;

    // [EARS: PLAY-006, PLAY-007, PLAY-008] Mixer handles mute/solo/sync logic
    mixer.play();
    setPlayState('playing');

    // Start metronome during playback
    const metronome = getMetronome();
    if (metronome) {
      metronome.start();
    }
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
    if (!mixer) return;

    mixer.stop();
    setPlayState('paused');

    // Stop metronome when pausing
    const metronome = getMetronome();
    if (metronome) {
      metronome.stop();
    }
  };

  /**
   * Handle Stop button click
   * [EARS: PLAY-003, SEEK-002] Stop and reset playhead to 0:00
   */
  const handleStop = () => {
    if (!mixer) return;

    mixer.stop();
    mixer.seek(0); // Reset playback position to start
    setPlayState('stopped');

    // Stop metronome when stopping
    const metronome = getMetronome();
    if (metronome) {
      metronome.stop();
    }

    // Reset time to 0 (this will trigger the seek useEffect)
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
   * Expose methods via ref for external control (e.g., keyboard shortcuts)
   */
  useImperativeHandle(ref, () => ({
    togglePlayPause: handlePlayPauseToggle,
  }));

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

        // Track that this is an internal time update
        lastInternalTimeRef.current = newTime;

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
        padding: '0.5rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '4px',
      }}
    >
      {/* Transport Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.3rem',
          marginBottom: '0.4rem',
        }}
      >
        {/* Play/Pause Toggle Button */}
        {/* [EARS: PLAY-001, PLAY-002] */}
        <button
          onClick={handlePlayPauseToggle}
          aria-label={playState === 'playing' ? 'Pause' : 'Play'}
          disabled={isLoading}
          style={{
            padding: '0.35rem 0.8rem',
            backgroundColor: isLoading ? '#666' : '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
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
            padding: '0.35rem 0.8rem',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
          }}
        >
          ■
        </button>

        {/* Time Display */}
        {/* [EARS: PLAY-005] Display elapsed time and total duration */}
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: '#fff',
            fontFamily: 'monospace',
            marginLeft: '0.5rem',
          }}
        >
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div
            style={{
              fontSize: '0.7rem',
              color: '#ffeb3b',
              marginLeft: '0.5rem',
            }}
          >
            Loading...
          </div>
        )}
      </div>
    </div>
  );
});
