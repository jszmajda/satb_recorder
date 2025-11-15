import { TopBar } from './components/TopBar';
import { MetronomeControl } from './components/MetronomeControl';
import { MicrophoneSelector } from './components/MicrophoneSelector';
import { ToneGenerator } from './components/ToneGenerator';
import { TransportControl } from './components/TransportControl';
import { ErrorNotification } from './components/ErrorNotification';
import { VoicePartSection } from './components/VoicePartSection';
import { RecordButton } from './components/RecordButton';
import { useProjectStore } from './store/useProjectStore';
import { useErrorStore } from './store/useErrorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { VoicePartType } from './store/types';

function App() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const addTrack = useProjectStore((state) => state.addTrack);
  const undoDeleteTrack = useProjectStore((state) => state.undoDeleteTrack);

  // Error handling [EARS: ERR-001, ERR-002, ERR-003]
  const error = useErrorStore((state) => state.error);
  const clearError = useErrorStore((state) => state.clearError);

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
                <TransportControl />
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
                      <RecordButton
                        voicePartId={voicePart.type}
                        bpm={currentProject.bpm}
                        onRecordingComplete={async (result) => {
                          // Add track to project via store
                          await addTrack(voicePart.type as VoicePartType, {
                            audioBlob: result.blob,
                            duration: result.duration,
                            waveformData: [], // TODO: Generate waveform data
                          });
                        }}
                      />
                      {/* TODO: Render existing tracks here */}
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
