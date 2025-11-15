import { TopBar } from './components/TopBar';
import { MetronomeControl } from './components/MetronomeControl';
import { MicrophoneSelector } from './components/MicrophoneSelector';
import { ToneGenerator } from './components/ToneGenerator';
import { PlaybackControls } from './components/PlaybackControls';
import { ErrorNotification } from './components/ErrorNotification';
import { VoicePartSection } from './components/VoicePartSection';
import { RecordButton } from './components/RecordButton';
import { TrackRow } from './components/TrackRow';
import { useProjectStore } from './store/useProjectStore';
import { useErrorStore } from './store/useErrorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Visualizer } from './audio/visualizer';
import type { VoicePartType } from './store/types';
import { useMemo, useState } from 'react';

function App() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const addTrack = useProjectStore((state) => state.addTrack);
  const undoDeleteTrack = useProjectStore((state) => state.undoDeleteTrack);
  const deleteTrack = useProjectStore((state) => state.deleteTrack);
  const setTrackSolo = useProjectStore((state) => state.setTrackSolo);
  const setTrackMute = useProjectStore((state) => state.setTrackMute);
  const setTrackVolume = useProjectStore((state) => state.setTrackVolume);
  const setTrackName = useProjectStore((state) => state.setTrackName);

  // Error handling [EARS: ERR-001, ERR-002, ERR-003]
  const error = useErrorStore((state) => state.error);
  const clearError = useErrorStore((state) => state.clearError);

  // [EARS: SEEK-001, SEEK-002, SEEK-003] Playback time state for seeking integration
  const [currentTime, setCurrentTime] = useState(0);

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
   * Keyboard shortcut: Ctrl+Z/Cmd+Z for undo delete
   * [EARS: TRACK-003] Restore last deleted track
   */
  useKeyboardShortcuts({
    onUndo: () => {
      try {
        undoDeleteTrack();
      } catch (error) {
        // Silently ignore if nothing to undo
        console.log('Nothing to undo');
      }
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Global Error Notification [EARS: ERR-001, ERR-002, ERR-003] */}
      <ErrorNotification error={error} onDismiss={clearError} />

      <TopBar />
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {!currentProject ? (
            <>
              <p className="text-gray-400 text-lg">
                Multi-track vocal harmony recorder for Soprano, Alto, Tenor, and Bass voices.
              </p>
              <p className="text-gray-500 text-sm mt-4">
                Create a new project to get started!
              </p>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold mb-4">Transport Controls</h2>
                {/* [EARS: SEEK-001, SEEK-002, SEEK-003, PLAY-001 through PLAY-008] PlaybackControls with seeking and playback */}
                <PlaybackControls
                  totalDuration={maxDuration}
                  tracks={allTracks}
                  currentTime={currentTime}
                  onCurrentTimeChange={setCurrentTime}
                  onSeek={setCurrentTime}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Metronome</h2>
                <MetronomeControl />
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Reference Tones</h2>
                <ToneGenerator />
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Microphone</h2>
                <MicrophoneSelector />
              </div>

              <div className="mt-8 space-y-4">
                <h2 className="text-xl font-bold mb-4">Voice Parts</h2>
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
                        tracks={voicePart.tracks.map(track => ({
                          id: track.id,
                          audioBlob: track.audioBlob,
                          volume: track.volume,
                          muted: track.muted,
                          soloed: track.soloed,
                        }))}
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
                          onSoloToggle={(trackId) => setTrackSolo(trackId, !track.soloed)}
                          onMuteToggle={(trackId) => setTrackMute(trackId, !track.muted)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
