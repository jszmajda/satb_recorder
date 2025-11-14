import { TopBar } from './components/TopBar';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopBar />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-400 text-lg">
            Multi-track vocal harmony recorder for Soprano, Alto, Tenor, and Bass voices.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            🎉 TopBar complete! Project controls now available.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Try: New Project → Create some tracks → Export to WAV/MP3!
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
