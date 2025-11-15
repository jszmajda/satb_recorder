# SATB - Multi-Track Vocal Harmony Recorder

A browser-based multi-track audio recorder designed for recording vocal harmonies (Soprano, Alto, Tenor, Bass). Built with React, TypeScript, and the Web Audio API.

## Features

### Recording
- **Multi-track recording** with dedicated voice part sections (SATB)
- **Overdub mode** - record new tracks while playing back existing ones
- **Low-latency recording** using AudioWorklet for professional-quality audio
- **Microphone device selection** with permission handling
- **VU meter** for real-time audio level monitoring
- **Metronome** with adjustable BPM (40-240) and visual beat indicator
- **Reference tone generator** for pitch reference (12 chromatic notes)
- **4-beat countdown** before recording starts

### Playback
- **Multi-track playback** with automatic anti-clipping gain reduction
- **Waveform visualization** for each track
- **Timeline seeking** - click waveforms to jump to any position
- **Individual track controls**: volume, mute, solo
- **Play/pause/stop** transport controls
- **Real-time solo/mute toggling** during playback without glitches

### Project Management
- **Auto-save** to IndexedDB - never lose your work
- **Project persistence** across browser sessions
- **Track deletion** with undo capability (Ctrl+Z)
- **Editable track names**
- **BPM persistence** per project

### Keyboard Shortcuts
- **Space** - Play/Pause
- **Ctrl+Z** - Undo track deletion

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Web Audio API** for audio processing
  - AudioWorklet for low-latency recording
  - GainNodes for mixing and volume control
  - Master gain for anti-clipping
- **IndexedDB** for client-side project storage
- **Zustand** for state management
- **Vitest** for testing (685 tests)
- **Bun** for package management and runtime

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) v1.2.18 or later
- Modern browser with Web Audio API support (Chrome, Firefox, Edge, Safari)
- Microphone access

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Start development server
bun run dev

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Type check
bun run type-check

# Build for production
bun run build
```

The development server runs at `http://localhost:5173/`

## Usage

### Creating a Project
1. Click "New Project" in the top bar
2. Enter a project name
3. Set your desired BPM (default: 120)

### Recording Your First Track
1. Select your microphone from the dropdown
2. Choose a voice part section (S/A/T/B)
3. Click the red record button
4. Wait for the 4-beat countdown
5. Sing along with the metronome
6. Click stop when finished

### Recording Overdubs
1. Enable "Overdub" mode (checkbox next to BPM)
2. Click record in any voice part section
3. The countdown starts and existing tracks will play back
4. Record your new track while listening to the mix
5. The new track is automatically added to the project

### Mixing Tracks
- **Volume**: Drag the volume slider (0-100%)
- **Mute**: Click the M button to silence a track
- **Solo**: Click the S button to hear only that track
- **Delete**: Click the trash icon (can undo with Ctrl+Z)
- **Rename**: Click the track name to edit

### Playback
- Click **Play/Pause** (▶/⏸) or press **Space**
- Click **Stop** (■) to reset to beginning
- **Click on any waveform** to seek to that position
- The playhead shows current position across all tracks

## Project Structure

```
src/
├── audio/              # Audio processing modules
│   ├── metronome.ts    # Metronome with Web Audio API
│   ├── mixer.ts        # Multi-track playback engine
│   ├── recorder.ts     # AudioWorklet-based recorder
│   ├── toneGenerator.ts # Reference tone generator
│   ├── visualizer.ts   # Waveform data generator
│   └── vuMeter.ts      # Audio level meter
├── components/         # React components
│   ├── ErrorNotification.tsx
│   ├── MetronomeControl.tsx
│   ├── MetronomeFlasher.tsx
│   ├── MicrophoneSelector.tsx
│   ├── PlaybackControls.tsx
│   ├── RecordButton.tsx
│   ├── ToneGenerator.tsx
│   ├── TopBar.tsx
│   ├── TrackRow.tsx
│   ├── VoicePartSection.tsx
│   └── Waveform.tsx
├── contexts/           # React contexts
│   └── MetronomeContext.tsx
├── db/                 # IndexedDB storage
│   └── index.ts
├── hooks/              # Custom React hooks
│   └── useKeyboardShortcuts.ts
├── store/              # Zustand stores
│   ├── useProjectStore.ts
│   ├── useErrorStore.ts
│   └── types.ts
└── App.tsx             # Main application component
```

## Architecture Highlights

### Audio Pipeline
- **Recording**: MediaStream → AudioWorklet → WAV encoder → IndexedDB
- **Playback**: AudioBuffer → BufferSource → GainNode → Master Gain → Destination
- **Mixing**: Individual track gains + master gain with 1/√N anti-clipping

### State Management
- **Zustand stores** for project state and error handling
- **React Context** for shared metronome instance
- **IndexedDB** for persistent storage with auto-save

### Performance
- **AudioWorklet** for main-thread-free recording
- **Debounced auto-save** to prevent excessive writes
- **Memoized waveform rendering**
- **Parallel track loading** in mixer

## Browser Compatibility

Tested and working in:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14.1+

Requires:
- Web Audio API
- AudioWorklet
- MediaDevices API
- IndexedDB

## License

MIT

## Development Notes

This project uses low-latency AudioWorklet for recording instead of the deprecated MediaRecorder API. Echo cancellation, auto gain control, and noise suppression are disabled to provide clean raw audio for music recording.

The mixer uses a master gain node with 1/√N scaling to prevent clipping when multiple tracks play simultaneously while maintaining reasonable loudness.

All audio processing happens in the browser - no server required!
