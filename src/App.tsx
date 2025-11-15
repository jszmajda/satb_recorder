import { TopBar } from './components/TopBar';
import { MetronomeControl } from './components/MetronomeControl';
import { MetronomeFlasher } from './components/MetronomeFlasher';
import { MicrophoneSelector } from './components/MicrophoneSelector';
import { ToneGenerator } from './components/ToneGenerator';
import { PlaybackControls, type PlaybackControlsHandle } from './components/PlaybackControls';
import { ErrorNotification } from './components/ErrorNotification';
import { VoicePartSection } from './components/VoicePartSection';
import { RecordButton } from './components/RecordButton';
import { TrackRow } from './components/TrackRow';
import { useProjectStore } from './store/useProjectStore';
import { useErrorStore } from './store/useErrorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Visualizer } from './audio/visualizer';
import type { VoicePartType } from './store/types';
import { useMemo, useState, useEffect, useRef } from 'react';

function App() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const addTrack = useProjectStore((state) => state.addTrack);
  const undoDeleteTrack = useProjectStore((state) => state.undoDeleteTrack);
  const deleteTrack = useProjectStore((state) => state.deleteTrack);
  const setTrackSolo = useProjectStore((state) => state.setTrackSolo);
  const setTrackMute = useProjectStore((state) => state.setTrackMute);
  const setTrackVolume = useProjectStore((state) => state.setTrackVolume);
  const setTrackName = useProjectStore((state) => state.setTrackName);
  const loadProject = useProjectStore((state) => state.loadProject);

  // Error handling [EARS: ERR-001, ERR-002, ERR-003]
  const error = useErrorStore((state) => state.error);
  const clearError = useErrorStore((state) => state.clearError);

  // [EARS: SEEK-001, SEEK-002, SEEK-003] Playback time state for seeking integration
  const [currentTime, setCurrentTime] = useState(0);

  // Ref for PlaybackControls to enable keyboard shortcuts
  const playbackControlsRef = useRef<PlaybackControlsHandle>(null);

  // Calculate maximum duration across all tracks for waveform alignment
  const maxDuration = useMemo(() => {
    if (!currentProject) return 0;

    let max = 0;
    for (const voicePart of currentProject.voiceParts) {
      for (const track of voicePart.tracks) {
        if (track.duration > max) {
          max = track.duration;
        }
      }
    }
    return max;
  }, [currentProject]);

  // Gather all tracks for playback
  const allTracks = useMemo(() => {
    if (!currentProject) return [];

    const tracks = [];
    for (const voicePart of currentProject.voiceParts) {
      for (const track of voicePart.tracks) {
        tracks.push({
          id: track.id,
          audioBlob: track.audioBlob,
          volume: track.volume,
          muted: track.muted,
          soloed: track.soloed,
        });
      }
    }
    return tracks;
  }, [currentProject]);

  // [EARS: SEEK-001, SEEK-002, SEEK-003] Handle seek from waveform
  const handleSeek = (trackId: string, time: number) => {
    setCurrentTime(time);
  };

  // [EARS: VIS-001, REC-008] Waveform visualizer for generating sparkline data
  const visualizer = useMemo(() => {
    const audioContext = new AudioContext();
    return new Visualizer(audioContext);
  }, []);

  /**
   * Initialize project from URL on mount
   * Check for ?project=<id> parameter and load that project
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');

    if (projectId && !currentProject) {
      // Try to load the project from the URL
      loadProject(projectId).catch((error) => {
        console.error('Failed to load project from URL:', error);
        // Clear invalid project ID from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('project');
        window.history.replaceState({}, '', url.toString());
      });
    }
  }, []); // Only run on mount

  /**
   * Keyboard shortcuts:
   * - Ctrl+Z/Cmd+Z for undo delete [EARS: TRACK-003]
   * - Space for play/pause toggle
   */
  useKeyboardShortcuts({
    onPlayPause: () => {
      playbackControlsRef.current?.togglePlayPause();
    },
    onUndo: () => {
      try {
        undoDeleteTrack();
      } catch (error) {
        // Silently ignore if nothing to undo
        console.log('Nothing to undo');
      }
    },
  });

  /**
   * Toggle track solo state
   * Looks up current state from project to avoid stale closures
   */
  const handleToggleSolo = (trackId: string) => {
    if (!currentProject) return;

    // Find the current track to get its current solo state
    let currentTrack = null;
    for (const voicePart of currentProject.voiceParts) {
      currentTrack = voicePart.tracks.find(t => t.id === trackId);
      if (currentTrack) break;
    }

    if (currentTrack) {
      setTrackSolo(trackId, !currentTrack.soloed);
    }
  };

  /**
   * Toggle track mute state
   * Looks up current state from project to avoid stale closures
   */
  const handleToggleMute = (trackId: string) => {
    if (!currentProject) return;

    // Find the current track to get its current mute state
    let currentTrack = null;
    for (const voicePart of currentProject.voiceParts) {
      currentTrack = voicePart.tracks.find(t => t.id === trackId);
      if (currentTrack) break;
    }

    if (currentTrack) {
      setTrackMute(trackId, !currentTrack.muted);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Global Error Notification [EARS: ERR-001, ERR-002, ERR-003] */}
      <ErrorNotification error={error} onDismiss={clearError} />

      <TopBar />
      <div className="p-3">
        <div className="max-w-7xl mx-auto space-y-2">
          {!currentProject ? (
            <>
              <p className="text-gray-400 text-sm">
                Multi-track vocal harmony recorder for Soprano, Alto, Tenor, and Bass voices.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Create a new project to get started!
              </p>
            </>
          ) : (
            <>
              {/* Two-column layout: Metronome flasher on left, controls on right */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Left column: Large metronome flasher */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <MetronomeFlasher />
                </div>

                {/* Right column: Controls stacked */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* [EARS: SEEK-001, SEEK-002, SEEK-003, PLAY-001 through PLAY-008] PlaybackControls with seeking and playback */}
                  <PlaybackControls
                    ref={playbackControlsRef}
                    totalDuration={maxDuration}
                    tracks={allTracks}
                    currentTime={currentTime}
                    onCurrentTimeChange={setCurrentTime}
                    onSeek={setCurrentTime}
                  />

                  {/* Metronome and Tone Generator on same row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <MetronomeControl />
                    <ToneGenerator />
                  </div>

                  <MicrophoneSelector />
                </div>
              </div>

              <div className="space-y-2">
                {currentProject.voiceParts.map((voicePart) => {
                  // Map voice part type to color
                  const colorMap = {
                    S: 'red' as const,
                    A: 'blue' as const,
                    T: 'green' as const,
                    B: 'purple' as const,
                  };

                  return (
                    <VoicePartSection
                      key={voicePart.type}
                      voicePartId={voicePart.type}
                      name={voicePart.label}
                      color={colorMap[voicePart.type]}
                      trackCount={voicePart.tracks.length}
                    >
                      {/* RecordButton for adding new tracks */}
                      {/* [EARS: REC-005, OVER-002, REC-009] Recording with overdub support and auto-save */}
                      <RecordButton
                        voicePartId={voicePart.type}
                        bpm={currentProject.bpm}
                        overdubEnabled={currentProject.overdubEnabled}
                        tracks={allTracks}
                        onRecordingComplete={async (result) => {
                          // [EARS: VIS-001, REC-008] Generate waveform data from recording
                          let waveformData: number[] = [];
                          try {
                            waveformData = await visualizer.generateWaveform(result.blob);
                          } catch (error) {
                            console.error('Failed to generate waveform:', error);
                            // Continue with empty waveform - non-critical feature
                          }

                          // [EARS: REC-009] Add track to project via store (auto-saves to IndexedDB)
                          await addTrack(voicePart.type as VoicePartType, {
                            audioBlob: result.blob,
                            duration: result.duration,
                            waveformData,
                          });
                        }}
                      />

                      {/* Existing tracks */}
                      {/* [EARS: SEEK-001, SEEK-002, SEEK-003] Waveform seeking integration */}
                      {voicePart.tracks.map((track) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          onDelete={deleteTrack}
                          onSoloToggle={handleToggleSolo}
                          onMuteToggle={handleToggleMute}
                          onVolumeChange={setTrackVolume}
                          onNameChange={setTrackName}
                          currentTime={currentTime}
                          onSeek={handleSeek}
                          maxDuration={maxDuration}
                        />
                      ))}
                    </VoicePartSection>
                  );
                })}
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.4rem 0.6rem',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '3px',
                  fontSize: '0.65rem',
                  color: '#888',
                }}
              >
                <strong style={{ color: '#aaa' }}>Shortcuts:</strong>
                <span style={{ marginLeft: '0.75rem' }}>
                  <kbd style={{ padding: '0.1rem 0.3rem', backgroundColor: '#333', borderRadius: '2px', marginRight: '0.25rem' }}>
                    Space
                  </kbd>
                  Play/Pause
                </span>
                <span style={{ marginLeft: '0.75rem' }}>
                  <kbd style={{ padding: '0.1rem 0.3rem', backgroundColor: '#333', borderRadius: '2px', marginRight: '0.25rem' }}>
                    Ctrl+Z
                  </kbd>
                  Undo
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
