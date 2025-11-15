# SATB Harmony Recorder - Technical Design Document

## Project Overview

A browser-based single-page application for recording multi-track SATB (Soprano, Alto, Tenor, Bass) vocal harmonies. Users can record multiple takes per voice part, overdub while listening to existing tracks, mix with individual track controls, and export the final mix as compressed audio.

**Target Platform:** Modern Chromium-based browsers (Chrome, Edge, Brave, etc.)

## Technology Stack

### Core Framework
- **Vite** - Fast build tool, perfect for pure client-side apps
  - No server-side rendering needed
  - Fast HMR (Hot Module Replacement)
  - Optimized production builds
- **React 18** - UI framework
- **TypeScript** - Type safety for complex audio state management

### Audio
- **Tone.js** - Audio framework built on Web Audio API
  - Precise metronome timing via Transport
  - Built-in scheduling and timing abstractions
  - Simplified audio routing
- **Web Audio API** - Direct access where needed
  - MediaRecorder for capturing microphone
  - AnalyserNode for waveform visualization and VU meter
  - GainNode for individual track volume
  - MediaDevices API for microphone enumeration/selection
- **lamejs** - Client-side MP3 encoding

### State Management
- **Zustand** - Lightweight state management
  - Simpler than Redux
  - Good TypeScript support
  - Minimal boilerplate

### Storage
- **Dexie.js** - IndexedDB wrapper
  - Store audio blobs (WAV format - uncompressed for quality)
  - Store project metadata
  - Auto-save on every change
  - Better than localStorage for large binary data

### UI/Styling
- **Tailwind CSS** - Utility-first CSS
  - Fast development
  - Consistent design system
  - Small production bundle

### Testing
- **Vitest** - Fast unit testing (Vite-native)
- **React Testing Library** - Component testing
- **Web Audio API mocks** - For testing audio logic
- **fake-indexeddb** - Mock IndexedDB for tests
- **TDD Approach** - Red-Green-Refactor loop for all features

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     React UI Layer                       │
│  (Components, Event Handlers, Visual State)              │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Zustand Store                           │
│  (Application State, Project Data, Track Metadata)       │
│  - Auto-saves on every change to IndexedDB               │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Audio Engine                            │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐       │
│  │ Recorder   │ │  Mixer      │ │  Metronome   │       │
│  │ Module     │ │  Module     │ │  Module      │       │
│  └────────────┘ └─────────────┘ └──────────────┘       │
│  ┌────────────┐ ┌─────────────┐                        │
│  │ Exporter   │ │ Visualizer  │                        │
│  │ Module     │ │ Module      │                        │
│  └────────────┘ └─────────────┘                        │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│           Tone.js + Web Audio API                        │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              IndexedDB (Dexie.js)                        │
│  (Audio Blobs as WAV, Project Metadata)                  │
└──────────────────────────────────────────────────────────┘
```

### Module Responsibilities

**Recorder Module**
- Enumerate available microphone devices
- Request microphone permissions
- Create MediaRecorder instance with selected device
- Display real-time VU meter during recording
- Record audio from current playhead position
- Convert to WAV blob
- Store in IndexedDB with track metadata

**Mixer Module**
- Load all track audio buffers
- Create GainNode per track
- Handle solo/mute logic (solo mutes all others, mute uses boolean flag)
- Sync playback across all tracks
- Control master playback (play/pause/stop)
- Respect overdub toggle for playback during recording

**Metronome Module**
- Visual flash sync (via callback to UI)
- BPM control (default 120, editable via input or +/- buttons)
- Start/stop independent of tracks

**ToneGenerator Module**
- Generate reference tones for pitch finding
- Provide 12-tone chromatic scale (C4 to B4, includes A440)
- Play tone on user interaction
- Stop tone on release or second click

**Visualizer Module**
- Analyze track audio buffer
- Generate sparkline data (simplified waveform)
- Update playhead position visual on each track
- Handle playhead click-to-seek
- Handle playhead drag-to-seek
- Real-time VU meter for recording input

**Exporter Module**
- Mix all enabled (non-muted) tracks with their gain levels
- Render to single audio buffer
- Export as WAV (uncompressed)
- Export as MP3 (using lamejs, 128kbps)

## Data Models

### Project
```typescript
interface Project {
  id: string;                    // UUID
  name: string;                  // User-defined project name (required at creation)
  bpm: number;                   // Metronome tempo
  overdubEnabled: boolean;       // Global overdub toggle
  createdAt: Date;
  updatedAt: Date;               // Auto-updated on every change
  voiceParts: VoicePart[];      // S, A, T, B
}
```

### VoicePart
```typescript
type VoicePartType = 'S' | 'A' | 'T' | 'B';

interface VoicePart {
  type: VoicePartType;
  label: string;                 // "Soprano", "Alto", etc.
  expanded: boolean;             // UI collapse/expand state
  tracks: Track[];              // Max 8 tracks per part
}
```

### Track
```typescript
interface Track {
  id: string;                    // UUID
  voicePartType: VoicePartType;
  name: string;                  // "S1", "S2", etc. (auto-generated)
  audioBlob: Blob;               // WAV audio data (uncompressed)
  duration: number;              // Seconds
  volume: number;                // 0-100 (maps to gain 0-1)
  muted: boolean;                // Boolean flag (does NOT affect GainNode)
  soloed: boolean;
  waveformData: number[];        // Sparkline visualization data
  createdAt: Date;
}
```

### AudioEngine State
```typescript
interface AudioEngineState {
  isPlaying: boolean;
  isRecording: boolean;
  playheadPosition: number;      // Seconds
  duration: number;              // Total project duration (longest track)
  selectedMicrophoneId: string | null;  // Selected microphone device ID
  availableMicrophones: MediaDeviceInfo[];  // List of available mics
}
```

### Undo State
```typescript
interface UndoState {
  lastDeletedTrack: Track | null;
  lastDeletedFromVoicePart: VoicePartType | null;
}
```

## EARS Requirements Specification

### Project Management

**PROJ-001**: WHEN user clicks "New Project", the system shall prompt for a project name.
**PROJ-002**: WHEN user creates a new project, the system shall initialize 4 empty voice parts (S, A, T, B).
**PROJ-003**: WHEN user creates a new project, the system shall set default BPM to 120.
**PROJ-004**: WHEN user creates a new project, the system shall set overdub to disabled by default.
**PROJ-005**: WHEN any project data changes, the system shall automatically save to IndexedDB.
**PROJ-006**: WHEN user clicks "Load", the system shall display a list of saved projects from IndexedDB.
**PROJ-007**: WHEN user selects a project to load, the system shall restore all project metadata and audio tracks.
**PROJ-008**: WHEN user clicks "Delete Project", the system shall remove the current project from IndexedDB.
**PROJ-009**: The system shall display the current project name in the top bar.

### Microphone & Input

**MIC-001**: WHEN the application first loads, the system shall enumerate all available microphone devices.
**MIC-002**: The system shall provide a UI control for selecting from available microphone devices.
**MIC-003**: WHEN user changes microphone selection, the system shall use the newly selected device for subsequent recordings.
**MIC-004**: WHEN microphone permission is denied, the system shall display an error message.
**MIC-005**: WHILE recording is active, the system shall display a real-time VU meter showing microphone input level.
**MIC-006**: WHEN microphone devices are enumerated AND no device is currently selected, the system shall automatically select a default device using the following priority:
  1. IF a device label starts with "default" (case insensitive), select that device
  2. ELSE select the last device in the enumerated list
  3. IF user has manually selected a device, the system shall preserve that selection when re-enumerating

### Recording

**REC-001**: WHEN user clicks "Add Track" (+), the system shall request microphone permissions if not already granted.
**REC-002**: WHEN user starts recording, the system shall display a countdown (3-2-1).
**REC-003**: WHEN countdown completes, the system shall start the MediaRecorder and metronome.
**REC-004**: WHILE recording is active, the system shall display a VU meter in place of the track sparkline.
**REC-005**: IF overdub is disabled, THEN the system shall mute all tracks during recording.
**REC-006**: IF overdub is enabled, THEN the system shall respect current solo/mute settings during recording.
**REC-007**: WHEN user stops recording, the system shall convert audio to WAV blob.
**REC-008**: WHEN recording completes, the system shall generate waveform data for sparkline visualization.
**REC-009**: WHEN recording completes, the system shall auto-save the track to IndexedDB.
**REC-010**: WHEN new track is added, the system shall auto-generate a track name (e.g., "S1", "S2").
**REC-011**: The system shall limit each voice part to a maximum of 8 tracks.

### Metronome

**MET-001**: The system shall provide a visual metronome indicator.
**MET-002**: The system shall allow BPM adjustment via increment (+) and decrement (-) buttons.
**MET-003**: The system shall allow BPM adjustment by typing a value directly into the input field.
**MET-004**: WHEN BPM changes, the system shall update the metronome tempo immediately.
**MET-005**: The metronome visual shall flash/pulse at the specified BPM.
**MET-006**: WHILE recording is active, the metronome shall remain synchronized.
**MET-007**: WHILE playback is active, the metronome shall remain synchronized.

### Playback & Transport

**PLAY-001**: WHEN user clicks Play, the system shall start playback from the current playhead position.
**PLAY-002**: WHEN user clicks Pause, the system shall pause playback and maintain playhead position.
**PLAY-003**: WHEN user clicks Stop, the system shall stop playback and reset playhead to 0:00.
**PLAY-004**: WHILE playing, the system shall update the playhead visual in real-time across all tracks.
**PLAY-005**: WHILE playing, the system shall display elapsed time and total duration.
**PLAY-006**: IF a track is muted, THEN the system shall exclude it from playback mix.
**PLAY-007**: IF a track is soloed, THEN the system shall mute all non-soloed tracks during playback.
**PLAY-008**: The system shall sync playback across all non-muted tracks.

### Seeking & Playhead

**SEEK-001**: WHEN user clicks on a track sparkline, the system shall move the playhead to that time position.
**SEEK-002**: WHEN user drags the playhead, the system shall update playhead position in real-time.
**SEEK-003**: IF playback is active during seek, THEN the system shall continue playing from the new position.
**SEEK-004**: The system shall display a playhead indicator on each visible track sparkline.

### Track Controls

**TRACK-001**: WHEN user clicks Delete on a track, the system shall store the track in single-level undo state.
**TRACK-002**: WHEN user clicks Delete on a track, the system shall remove it from IndexedDB and UI.
**TRACK-003**: WHEN user presses Ctrl+Z (Cmd+Z on Mac), the system shall restore the last deleted track.
**TRACK-004**: The system shall limit undo to a single level (last deleted track only).
**TRACK-005**: WHEN user clicks Solo on a track, the system shall set that track's solo flag to true.
**TRACK-006**: WHEN user clicks Mute on a track, the system shall set that track's mute boolean to true.
**TRACK-007**: The mute flag shall NOT modify the track's GainNode or volume setting.
**TRACK-008**: WHEN user adjusts volume slider, the system shall update the track's GainNode gain (0-100 → 0-1).
**TRACK-009**: WHEN user adjusts volume slider, the system shall preserve the volume setting when muted.
**TRACK-010**: WHEN user clicks track name, the system shall allow inline editing of track name.
**TRACK-011**: The system shall display track controls in this order: [Delete] [Name] [Solo] [Mute] [Volume Slider] [Sparkline].

### Voice Parts

**VOICE-001**: The system shall provide 4 voice part sections: Soprano (S), Alto (A), Tenor (T), Bass (B).
**VOICE-002**: WHEN user clicks collapse/expand toggle, the system shall hide/show tracks for that voice part.
**VOICE-003**: The system shall display track count for each voice part.
**VOICE-004**: The system shall color-code voice parts (S=red, A=blue, T=green, B=purple).

### Visualization

**VIS-001**: The system shall generate sparkline waveform data for each track (100-200 data points).
**VIS-002**: The system shall display sparklines for all tracks.
**VIS-003**: WHILE recording, the system shall display a VU meter instead of sparkline for the recording track.
**VIS-004**: The system shall display a synchronized playhead indicator across all visible sparklines.

### Export

**EXP-001**: WHEN user selects "Export WAV", the system shall mix all non-muted tracks with their volume levels.
**EXP-002**: WHEN user selects "Export WAV", the system shall render to uncompressed WAV format.
**EXP-003**: WHEN user selects "Export WAV", the system shall trigger browser download with filename "<project-name>.wav".
**EXP-004**: WHEN user selects "Export MP3", the system shall mix all non-muted tracks with their volume levels.
**EXP-005**: WHEN user selects "Export MP3", the system shall encode to MP3 at 128kbps using lamejs.
**EXP-006**: WHEN user selects "Export MP3", the system shall trigger browser download with filename "<project-name>.mp3".
**EXP-007**: The export dropdown shall provide both WAV and MP3 options.

### Overdub Control

**OVER-001**: The system shall provide a global overdub toggle control in the UI.
**OVER-002**: WHEN overdub is disabled (default), the system shall mute all tracks during recording.
**OVER-003**: WHEN overdub is enabled, the system shall play non-muted tracks during recording.
**OVER-004**: The overdub setting shall be saved with the project.

### Tone Generator (Pitch Reference)

**TONE-001**: The system shall provide a tone generator for pitch reference.
**TONE-002**: The tone generator shall provide 12 chromatic tones from C4 (261.63 Hz) to B4 (493.88 Hz), including A4 (440 Hz).
**TONE-003**: The system shall display tone controls to the right of the microphone selector.
**TONE-004**: WHEN user clicks/presses a tone button, the system shall play that tone.
**TONE-005**: WHEN user releases or clicks again, the system shall stop the tone.
**TONE-006**: The tone generator UI may render as piano keys OR as labeled buttons showing note names.

### Error Handling

**ERR-001**: IF microphone permission is denied, THEN the system shall display a user-friendly error message.
**ERR-002**: IF storage quota is exceeded, THEN the system shall notify the user.
**ERR-003**: IF audio encoding fails, THEN the system shall display an error and not create an invalid track.

## Core Features & User Workflows

### 1. New Project
1. User clicks "New"
2. System prompts for project name
3. User enters name and confirms
4. System initializes empty project with 4 voice parts (S, A, T, B)
5. System sets BPM to 120, overdub disabled
6. System auto-saves to IndexedDB

### 2. Recording a Track

**Initial Setup:**
1. User selects microphone from dropdown (if multiple available)
2. User enables/disables overdub toggle as desired
3. User clicks (+) next to voice part

**Recording Flow:**
1. System requests microphone permission (if first time)
2. System shows countdown (3-2-1)
3. System starts metronome visual flash
4. System starts MediaRecorder
5. System displays VU meter in track row (where sparkline will be)
6. If overdub disabled: all tracks muted
7. If overdub enabled: respect solo/mute settings
8. User sings, watching metronome and VU meter
9. User clicks Stop

**Post-Recording:**
1. System converts to WAV blob
2. System generates waveform data
3. System stores in IndexedDB (auto-save)
4. System adds track to UI with auto-generated name (S1, S2, etc.)
5. System replaces VU meter with sparkline visualization

### 3. Track Controls

**Delete:**
1. User clicks (×) button
2. System stores track in single-level undo state
3. System removes from UI and IndexedDB
4. System auto-saves

**Undo Delete:**
1. User presses Ctrl+Z (Cmd+Z on Mac)
2. System restores track from undo state
3. System re-inserts into IndexedDB and UI
4. System auto-saves

**Solo:**
1. User clicks Solo [S] on track
2. System sets solo flag on track
3. During playback: all non-soloed tracks muted
4. System auto-saves

**Mute:**
1. User clicks Mute [M] on track
2. System sets mute boolean flag (does NOT modify volume/GainNode)
3. During playback: track excluded from mix
4. Track grayed out in UI
5. System auto-saves

**Volume:**
1. User adjusts horizontal slider (0-100)
2. System maps to GainNode gain (0-1)
3. Volume persists independently of mute state
4. Real-time volume adjustment during playback
5. System auto-saves

### 4. Playback & Seeking

**Play/Pause:**
1. User clicks Play
2. System starts all non-muted, non-solo-excluded tracks from playhead position
3. System updates playhead visual in real-time across all sparklines
4. System syncs metronome if enabled
5. User clicks Pause
6. System pauses, maintains playhead position

**Seek (Click):**
1. User clicks on track sparkline
2. System calculates time position from click X coordinate
3. System updates playhead position
4. If playing, system continues from new position

**Seek (Drag):**
1. User clicks and drags playhead indicator
2. System updates playhead position in real-time during drag
3. System updates time display
4. If playing, system continues from new position on release

**Stop:**
1. User clicks Stop
2. System stops playback
3. System resets playhead to 0:00

### 5. Metronome Control

**Via Buttons:**
1. User clicks (-) or (+) button
2. System decrements/increments BPM by 1
3. System updates metronome tempo
4. System auto-saves

**Via Direct Input:**
1. User clicks on BPM value
2. User types new BPM value
3. User presses Enter or clicks away
4. System updates metronome tempo
5. System auto-saves

### 6. Load Project
1. User clicks "Load"
2. System displays list of saved projects from IndexedDB
3. User selects project
4. System loads metadata
5. System loads audio blobs for each track
6. System reconstructs UI state (expanded/collapsed, playhead, etc.)

### 7. Delete Project
1. User clicks "Delete Project" button
2. System prompts for confirmation
3. User confirms
4. System removes project from IndexedDB
5. System returns to new project state

### 8. Export

**Export WAV:**
1. User clicks "Export" → "WAV"
2. System mixes all non-muted tracks with volume levels
3. System renders to single audio buffer
4. System converts to WAV blob
5. System triggers browser download: "<project-name>.wav"

**Export MP3:**
1. User clicks "Export" → "MP3"
2. System mixes all non-muted tracks with volume levels
3. System encodes to MP3 using lamejs (128kbps)
4. System triggers browser download: "<project-name>.mp3"

## UI/UX Specifications

### Layout Structure
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [New] [Load] [Export ▼]   Project: "My Harmony"  [Delete Project]           │
├──────────────────────────────────────────────────────────────────────────────┤
│ Metronome: [−] [120] [+] [□ Flash]   Overdub: [Toggle]                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Play/Pause] [Stop]    Playhead: 00:23 / 02:45                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Microphone: [Select Device ▼]  |  Pitch: [C][C#][D][D#][E][F][F#][G][G#][A][A#][B] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ ▼ Soprano (4 tracks)                                                         │
│   [×] S1 [S] [M] [====░░░░] ───/\|─/\───/\─ (playhead: |)                   │
│   [×] S2 [S] [M] [======░░] ──/\─|─/\──/\── (playhead: |)                   │
│   [×] S3 [S] [M] [===░░░░░] ───/\|──/\───/\ (playhead: |)                   │
│   [×] S4 [S] [M] [=====░░░] ──/\─|─/\──/\── (playhead: |)                   │
│   [+ Add Track]                                                               │
│                                                                               │
│ ▼ Alto (2 tracks)                                                            │
│   [×] A1 [S] [M] [====░░░░] ───/\|─/\───/\─                                 │
│   [×] A2 [S] [M] [======░░] ──/\─|─/\──/\──                                 │
│   [+ Add Track]                                                               │
│                                                                               │
│ ▶ Tenor (collapsed)                                                          │
│                                                                               │
│ ▶ Bass (collapsed)                                                           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**TopBar**
- New Project button (prompts for name)
- Load button (shows project list)
- Export dropdown (WAV/MP3 options)
- Project name display (editable)
- Delete Project button

**MetronomeControl**
- BPM decrease button (-)
- BPM input (editable, type to change)
- BPM increase button (+)
- Visual flash indicator (simple box that pulses)
- Overdub toggle switch

**MicrophoneSelector**
- Dropdown showing available microphone devices
- Selected device persists for recording sessions

**ToneGenerator**
- 12 tone buttons for chromatic scale (C4 to B4)
- Display note names on buttons (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- Optional: Piano key visual styling
- Click/press to play tone, release/click again to stop
- Positioned to the right of microphone selector

**TransportControl**
- Play/Pause button (single toggle button)
- Stop button
- Playhead time display (current / total)

**VoicePartSection** (x4, one per S/A/T/B)
- Collapse/expand toggle
- Voice part label + track count
- Color-coded background (S=red, A=blue, T=green, B=purple)
- TrackRow components
- Add Track button (+)

**TrackRow**
- Delete button [×]
- Track name (editable on click)
- Solo button [S] (toggle)
- Mute button [M] (toggle)
- Volume slider (horizontal, 0-100)
- Waveform sparkline (clickable/draggable for seeking)
  - Shows playhead indicator (vertical line)
  - Replaced by VU meter during recording
- Playhead indicator (thin vertical line, synced across all tracks)

### Visual Design Notes
- **Color coding**: Voice parts have colored headers/accents (S=red, A=blue, T=green, B=purple)
- **Metronome flash**: Simple box that changes color on each beat
- **Sparkline**: Simplified waveform, 100-200 data points
- **Playhead**: Thin vertical line across all tracks, synced position, draggable
- **VU Meter**: Real-time bar/line showing microphone input level during recording
- **Muted tracks**: Grayed out but volume slider still functional

## Testing Strategy

### Test-Driven Development (TDD)
**Red-Green-Refactor Loop:**
1. **Red**: Write failing test for new feature/requirement
2. **Green**: Write minimal code to pass test
3. **Refactor**: Clean up code while keeping tests green

All EARS requirements should have corresponding tests. Each requirement ID (e.g., PROJ-001) should map to one or more test cases.

### Test Coverage Areas

**Unit Tests (Vitest)**
- Audio Engine modules (mocked Web Audio API)
  - Recorder: device enumeration, track recording, WAV conversion, VU meter
  - Mixer: track mixing, solo/mute logic (boolean flags), volume control
  - Metronome: BPM calculation, timing, visual callback
  - Exporter: mixing algorithm, WAV/MP3 format conversion
- State management (Zustand store)
  - Project CRUD operations
  - Auto-save on changes
  - Track operations (add/delete/update)
  - Undo/redo logic (single-level)
  - Overdub toggle
- Utilities
  - Audio buffer processing
  - Waveform data generation
  - Time formatting
  - Microphone enumeration

**Component Tests (React Testing Library)**
- TopBar: New, Load, Delete Project, project name display
- MicrophoneSelector: device enumeration, selection
- ToneGenerator: tone playback, note buttons, stop on release/second click
- TrackRow: delete, solo, mute, volume, name editing
- VoicePartSection: collapse/expand, track management
- MetronomeControl: BPM adjustments (buttons & direct input), overdub toggle
- TransportControl: play/pause/stop, time display
- Waveform: sparkline rendering, playhead, click/drag seeking, VU meter

**Integration Tests**
- Full record → playback → export workflow
- Load project flow
- Solo/Mute interactions across tracks
- Overdub enabled/disabled recording
- Auto-save functionality
- Undo delete → restore track

### Mocking Strategy
- Mock Web Audio API (AudioContext, GainNode, AnalyserNode, MediaRecorder)
- Mock MediaDevices API (enumerateDevices, getUserMedia)
- Mock IndexedDB (using fake-indexeddb)
- Mock Tone.js Transport

## Project Structure

```
recorder/
├── docs/
│   ├── DESIGN.md                # This document
│   └── IMPLEMENTATION.md        # Implementation plan with checklist
├── public/
│   └── index.html
├── src/
│   ├── main.tsx                 # App entry point
│   ├── App.tsx                  # Root component
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── MicrophoneSelector.tsx
│   │   ├── ToneGenerator.tsx
│   │   ├── MetronomeControl.tsx
│   │   ├── TransportControl.tsx
│   │   ├── VoicePartSection.tsx
│   │   ├── TrackRow.tsx
│   │   ├── Waveform.tsx
│   │   └── VUMeter.tsx
│   ├── audio/
│   │   ├── engine.ts            # Audio engine coordinator
│   │   ├── recorder.ts          # Recording logic + device management
│   │   ├── mixer.ts             # Mixing & playback
│   │   ├── metronome.ts         # Metronome timing
│   │   ├── toneGenerator.ts     # Pitch reference tone generation
│   │   ├── visualizer.ts        # Waveform generation + VU meter
│   │   └── exporter.ts          # WAV/MP3 export
│   ├── store/
│   │   ├── useProjectStore.ts   # Zustand store with auto-save
│   │   └── types.ts             # TypeScript interfaces
│   ├── db/
│   │   └── index.ts             # Dexie.js setup
│   ├── utils/
│   │   ├── audio.ts             # Audio helpers
│   │   ├── time.ts              # Time formatting
│   │   └── constants.ts         # App constants
│   └── tests/
│       ├── audio/
│       ├── components/
│       └── store/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── CLAUDE.md                    # Claude Code instructions
```

## Technical Constraints

### Browser Compatibility
- **Target**: Latest Chromium-based browsers (Chrome, Edge, Brave)
- **No legacy browser support needed**
- **No polyfills required**

### Audio Storage
- **Format**: Uncompressed WAV for all stored tracks
- **Rationale**: Maintains maximum quality, export compression happens only on demand
- **Trade-off**: Larger storage footprint acceptable for target use case

### Performance
- **Not a primary concern** for this version
- System should handle 32 tracks (8 per voice part) without critical failures
- UI responsiveness more important than speed optimization

## Success Criteria

### Minimum Viable Product (MVP)
- ✅ Record multiple tracks per voice part (SATB) with selectable microphone
- ✅ Play back with individual volume control
- ✅ Solo/mute functionality (mute as boolean flag, preserves volume)
- ✅ Visual metronome with editable BPM
- ✅ Overdub toggle control
- ✅ VU meter during recording
- ✅ Draggable playhead
- ✅ Export to WAV/MP3
- ✅ Auto-save projects with prompted name
- ✅ Load/delete projects
- ✅ All EARS requirements covered by tests (TDD)

---

**Document Version:** 2.0
**Last Updated:** 2025-11-13
**Author:** Claude Code + Jess
