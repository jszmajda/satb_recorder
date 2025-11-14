import { TopBar } from './components/TopBar';
import { MetronomeControl } from './components/MetronomeControl';
import { MicrophoneSelector } from './components/MicrophoneSelector';
import { ToneGenerator } from './components/ToneGenerator';
import { TransportControl } from './components/TransportControl';
import { useProjectStore } from './store/useProjectStore';

function App() {
  const currentProject = useProjectStore((state) => state.currentProject);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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

              <div className="mt-8">
                <p className="text-gray-500 text-sm">
                  Track recording controls coming soon...
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
