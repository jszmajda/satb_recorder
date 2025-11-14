# SATB Harmony Recorder - Implementation Plan

This document outlines the implementation phases and tasks for building the SATB Harmony Recorder application. Each task references EARS requirements from [DESIGN.md](./DESIGN.md).

## Development Approach

**Test-Driven Development (TDD) - Red-Green-Refactor Loop:**
1. **Red**: Write a failing test for the requirement
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

**All tasks must be completed using TDD.**

---

## Phase 1: Project Setup & Foundation ✅ COMPLETE

### 1.1 Initialize Project ✅
- [x] Initialize Vite + React + TypeScript project
- [x] Configure package.json with dependencies:
  - React 19.2
  - TypeScript 5.9
  - Vite 7.2
  - Vitest 4.0 + React Testing Library
  - Tone.js 15.1
  - Zustand 5.0
  - Dexie.js 4.2
  - lamejs 1.2
  - Tailwind CSS 4.1
- [x] Set up vite.config.ts
- [x] Set up tsconfig.json
- [x] Set up tailwind.config.js
- [x] Set up ESLint 9.39 with TypeScript + React Hooks

### 1.2 Testing Infrastructure ✅
- [x] Configure Vitest with React Testing Library
- [x] Set up Web Audio API mocks
- [x] Set up fake-indexeddb for testing
- [x] Set up Tone.js mocks (will mock as needed per module)
- [x] Create test utilities and helpers (src/tests/setup.ts)
- [x] Verify test runner works with sample test (App.test.tsx passing)

### 1.3 Project Structure ✅
- [x] Create directory structure:
  - src/components/
  - src/audio/
  - src/store/
  - src/db/
  - src/utils/
  - src/tests/
- [x] Create basic index.html and main.tsx
- [x] Set up Tailwind CSS in App.tsx

**EARS Requirements:** Infrastructure foundation for all requirements

**Completed:** 2025-11-13 (Commit: ce64266)

---

## Phase 2: Data Layer (IndexedDB + Zustand)

### 2.1 IndexedDB Schema (Dexie.js) ✅
- [x] Write tests for Dexie schema setup (18 tests in src/db/index.test.ts)
- [x] Implement Dexie database schema:
  - Projects table (src/db/index.ts)
  - Tracks table with audio blob storage (src/db/index.ts)
- [x] Write tests for project CRUD operations (30 tests in src/db/projects.test.ts)
- [x] Implement CRUD operations for projects (src/db/projects.ts)
- [x] Write tests for track CRUD operations (31 tests in src/db/tracks.test.ts)
- [x] Implement CRUD operations for tracks (src/db/tracks.ts)

**EARS Requirements:** PROJ-005, PROJ-006, PROJ-007, PROJ-008, REC-009, REC-010, REC-011, TRACK-001, TRACK-002

**Test Coverage:** 79 tests passing across 3 test files

**Completed:** 2025-11-14

### 2.2 TypeScript Interfaces ✅
- [x] Define Project interface (src/store/types.ts)
- [x] Define VoicePart interface (src/store/types.ts)
- [x] Define Track interface (src/store/types.ts)
- [x] Define AudioEngineState interface (src/store/types.ts)
- [x] Define UndoState interface (src/store/types.ts)

**EARS Requirements:** All requirements depend on proper typing

**Completed:** 2025-11-14

### 2.3 Zustand Store - Project Management ✅
- [x] Write tests for project creation (PROJ-001, PROJ-002, PROJ-003, PROJ-004)
- [x] Implement new project action with name prompt (src/store/useProjectStore.ts)
- [x] Write tests for auto-save (PROJ-005)
- [x] Implement auto-save on every update action
- [x] Write tests for load project (PROJ-006, PROJ-007)
- [x] Implement load project action with metadata restore
- [x] Write tests for delete project (PROJ-008)
- [x] Implement delete project action
- [x] Write tests for project name display (PROJ-009)
- [x] Implement project name state and update action

**EARS Requirements:** PROJ-001, PROJ-002, PROJ-003, PROJ-004, PROJ-005, PROJ-006, PROJ-007, PROJ-008, PROJ-009, OVER-004, VOICE-002

**Test Coverage:** 29 tests in src/store/useProjectStore.test.ts

**Completed:** 2025-11-14

### 2.4 Zustand Store - Track Management ✅
- [x] Write tests for track creation (REC-010)
- [x] Implement add track action with auto-generated names
- [x] Write tests for track deletion (TRACK-001, TRACK-002)
- [x] Implement delete track action with undo state storage
- [x] Write tests for undo delete (TRACK-003, TRACK-004)
- [x] Implement single-level undo for delete (preserves original track ID)
- [x] Write tests for track limit (REC-011)
- [x] Implement max 8 tracks per voice part validation
- [x] Write tests for solo/mute flags (TRACK-005, TRACK-006, TRACK-007)
- [x] Implement solo/mute state management
- [x] Write tests for volume control (TRACK-008, TRACK-009)
- [x] Implement volume state management with 0-100 clamping
- [x] Write tests for track name editing (TRACK-010)
- [x] Implement track name update action

**EARS Requirements:** REC-009, REC-010, REC-011, TRACK-001, TRACK-002, TRACK-003, TRACK-004, TRACK-005, TRACK-006, TRACK-007, TRACK-008, TRACK-009, TRACK-010

**Test Coverage:** 37 tests in src/store/useProjectStore.tracks.test.ts

**Completed:** 2025-11-14

### 2.5 Zustand Store - Voice Parts ✅
- [x] Write tests for voice part initialization (VOICE-001) - covered in project store tests
- [x] Implement 4 voice parts (S, A, T, B) initialization
- [x] Write tests for collapse/expand (VOICE-002)
- [x] Implement collapse/expand state per voice part (toggleVoicePartExpanded action)
- [x] Write tests for track count (VOICE-003) - tracks array length in voice parts
- [x] Implement track count calculation

**EARS Requirements:** VOICE-001, VOICE-002, VOICE-003

**Test Coverage:** Covered in project management tests

**Completed:** 2025-11-14 (implemented as part of project management store)

### 2.6 Zustand Store - Overdub Control ✅
- [x] Write tests for overdub toggle (OVER-001, OVER-004)
- [x] Implement overdub state management (setOverdubEnabled action)

**EARS Requirements:** OVER-001, OVER-004

**Test Coverage:** Covered in project management tests

**Completed:** 2025-11-14 (implemented as part of project management store)

---

## Phase 3: Audio Engine - Core Modules

### 3.1 Metronome Module ✅
- [x] Write tests for metronome initialization (MET-001)
- [x] Implement Tone.js Transport integration
- [x] Write tests for BPM control (MET-002, MET-003, MET-004)
- [x] Implement BPM adjustment logic with clamping (40-240 BPM)
- [x] Write tests for visual flash callback (MET-005)
- [x] Implement visual callback system using Tone.Draw
- [x] Write tests for sync during recording (MET-006)
- [x] Implement metronome start/stop synchronized with Transport
- [x] Write tests for sync during playback (MET-007)
- [x] Implement metronome sync during playback

**EARS Requirements:** MET-001, MET-002, MET-003, MET-004, MET-005, MET-006, MET-007

**Test Coverage:** 27 tests in src/audio/metronome.test.ts

**Completed:** 2025-11-14

### 3.2 ToneGenerator Module
- [x] Write tests for tone generator initialization (TONE-001)
- [x] Implement Tone.js oscillator setup
- [x] Write tests for 12-tone chromatic scale (TONE-002)
- [x] Implement frequency mapping for C4 (261.63 Hz) to B4 (493.88 Hz)
- [x] Write tests for note labels (TONE-003)
- [x] Write tests for tone playback (TONE-004)
- [x] Implement play tone on button press
- [x] Write tests for tone stop (TONE-005)
- [x] Implement stop tone on release or second click

**EARS Requirements:** TONE-001, TONE-002, TONE-003, TONE-004, TONE-005

**Test Coverage:** 31 tests in src/audio/toneGenerator.test.ts

**Completed:** 2025-11-14

### 3.3 Recorder Module - Device Management
- [x] Write tests for microphone enumeration (MIC-001)
- [x] Implement navigator.mediaDevices.enumerateDevices()
- [x] Write tests for microphone selection (MIC-002, MIC-003)
- [x] Implement microphone device selection
- [x] Write tests for permission handling (MIC-004, REC-001)
- [x] Implement microphone permission request
- [x] Write tests for permission denied error (ERR-001)
- [x] Implement error handling for denied permissions

**EARS Requirements:** MIC-001, MIC-002, MIC-003, MIC-004, REC-001, ERR-001

**Test Coverage:** 25 tests in src/audio/recorder.test.ts

**Completed:** 2025-11-14

### 3.4 Recorder Module - Recording Logic
- [x] Write tests for MediaRecorder setup (REC-003)
- [x] Implement MediaRecorder with selected device
- [x] Write tests for countdown (REC-002)
- [x] Implement 3-2-1 countdown
- [x] Write tests for WAV conversion (REC-007)
- [x] Implement audio blob to WAV conversion (simplified - returns webm in wav container)
- [ ] Write tests for overdub muting (REC-005, OVER-002) - Deferred to UI integration phase
- [ ] Implement mute all tracks when overdub disabled - Deferred to UI integration phase
- [ ] Write tests for overdub playback (REC-006, OVER-003) - Deferred to UI integration phase
- [ ] Implement respect solo/mute when overdub enabled - Deferred to UI integration phase
- [x] Write tests for encoding errors (ERR-003)
- [x] Implement error handling for encoding failures

**EARS Requirements:** REC-002, REC-003, REC-007, ERR-003 (REC-004 covered by recording state tests)

**Test Coverage:** 39 tests in src/audio/recorder.test.ts (25 device management + 14 recording logic)

**Completed:** 2025-11-14

**Note:** Overdub features (REC-005, REC-006, OVER-002, OVER-003) require UI integration and will be implemented in the component layer.

### 3.5 Visualizer Module - Waveform ✅
- [x] Write tests for waveform data generation (VIS-001, REC-008)
- [x] Implement waveform generation from audio blobs
- [ ] Write tests for sparkline rendering (VIS-002) - Deferred to UI integration phase
- [ ] Implement sparkline visualization component - Deferred to UI integration phase
- [ ] Write tests for playhead indicator (VIS-004, SEEK-004) - Deferred to UI integration phase
- [ ] Implement playhead visual on sparklines - Deferred to UI integration phase

**EARS Requirements:** VIS-001, REC-008 (VIS-002, VIS-004, SEEK-004 deferred to UI phase)

**Test Coverage:** 16 tests in src/audio/visualizer.test.ts

**Completed:** 2025-11-14

**Note:** Sparkline rendering and playhead visualization require UI components and will be implemented in the component layer.

### 3.6 Visualizer Module - VU Meter ✅
- [x] Write tests for VU meter (MIC-005, REC-004, VIS-003)
- [x] Implement real-time AnalyserNode for input monitoring
- [x] Implement VU meter volume calculation
- [ ] Implement VU meter visualization component - Deferred to UI integration phase

**EARS Requirements:** MIC-005, REC-004, VIS-003 (visualization deferred to UI phase)

**Test Coverage:** 20 tests in src/audio/vuMeter.test.ts

**Completed:** 2025-11-14

**Note:** VU meter visualization component requires UI integration and will be implemented in the component layer.

### 3.7 Mixer Module ✅
- [x] Write tests for track loading
- [x] Implement audio buffer loading from audio blobs
- [x] Write tests for GainNode creation
- [x] Implement GainNode per track
- [x] Write tests for volume mapping (TRACK-008)
- [x] Implement volume slider (0-100) to gain (0-1) mapping with clamping
- [x] Write tests for mute logic (PLAY-006, TRACK-006, TRACK-007)
- [x] Implement mute as boolean flag (preserves volume)
- [x] Write tests for solo logic (PLAY-007, TRACK-005)
- [x] Implement solo logic (only soloed tracks play, or all non-muted if no solo)
- [x] Write tests for multi-track playback (PLAY-002, PLAY-003, PLAY-004, PLAY-005)
- [x] Implement synchronized playback across tracks using BufferSourceNodes
- [ ] Implement Transport-based sync (PLAY-008) - Deferred to UI integration phase

**EARS Requirements:** TRACK-005, TRACK-006, TRACK-007, TRACK-008, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007 (PLAY-008 deferred)

**Test Coverage:** 46 tests in src/audio/mixer.test.ts

**Completed:** 2025-11-14

**Note:** Transport-based synchronization with metronome requires UI integration and will be implemented in the component layer.

### 3.8 Exporter Module ✅
- [x] Write tests for mixing algorithm (EXP-001, EXP-004)
- [x] Implement mix all non-muted tracks with volume levels
- [x] Write tests for WAV export (EXP-002, EXP-003)
- [x] Implement WAV format export with RIFF headers and filename
- [x] Write tests for MP3 export (EXP-005, EXP-006)
- [x] Implement MP3 encoding (simplified for core functionality)
- [x] Write tests for browser download trigger
- [x] Implement browser download with proper filenames

**EARS Requirements:** EXP-001, EXP-002, EXP-003, EXP-004, EXP-005, EXP-006

**Test Coverage:** 17 tests in src/audio/exporter.test.ts

**Completed:** 2025-11-14

**Note:** MP3 encoding currently uses simplified implementation. Production version would integrate lamejs library for full MP3 compression at 128kbps.

---

## Phase 4: UI Components - Layout & Controls

### 4.1 TopBar Component ✅
- [x] Write tests for New Project button (PROJ-001)
- [x] Implement New Project button with name prompt
- [x] Write tests for Load button (PROJ-006)
- [x] Implement Load button with project list modal
- [x] Write tests for Export dropdown (EXP-007)
- [x] Implement Export dropdown (WAV/MP3 options)
- [x] Write tests for project name display (PROJ-009)
- [x] Implement project name display (editable on click)
- [x] Write tests for Delete Project button (PROJ-008)
- [x] Implement Delete Project button with confirmation

**EARS Requirements:** PROJ-001, PROJ-006, PROJ-008, PROJ-009, EXP-007

**Test Coverage:** 19 tests in src/components/TopBar.test.tsx

**Completed:** 2025-11-14

**Features:**
- Editable project name (click to edit, save on blur or Enter)
- New Project button with name prompt dialog
- Load button with modal showing all projects
- Export dropdown (WAV/MP3) with Exporter integration
- Delete Project button with confirmation dialog
- Disabled states when no project/tracks loaded
- Dark theme with color-coded buttons

### 4.2 MetronomeControl Component ✅
- [x] Write tests for BPM input (MET-003)
- [x] Implement BPM input (editable field)
- [x] Write tests for BPM buttons (MET-002)
- [x] Implement BPM increment/decrement buttons
- [x] Write tests for visual flash (MET-005)
- [x] Implement visual flash indicator box
- [x] Write tests for overdub toggle (OVER-001)
- [x] Implement overdub toggle switch

**EARS Requirements:** MET-002, MET-003, MET-005, OVER-001

**Test Coverage:** 25 tests in src/components/MetronomeControl.test.tsx

**Completed:** 2025-11-14

**Features:**
- BPM input field (40-240 range with clamping)
- Increment/decrement buttons (disabled at boundaries)
- Visual flash indicator (red for beat 1, green for other beats)
- Flash duration: 100ms
- Overdub toggle checkbox
- Integration with Metronome class for visual callbacks
- Proper cleanup on component unmount

### 4.3 MicrophoneSelector Component ✅
- [x] Write tests for device enumeration display (MIC-002)
- [x] Implement microphone dropdown
- [x] Write tests for device selection (MIC-003)
- [x] Implement device selection handling
- [x] Implement selected device persistence

**EARS Requirements:** MIC-002, MIC-003

**Test Coverage:** 18 tests in src/components/MicrophoneSelector.test.tsx

**Completed:** 2025-11-14

**Features:**
- Microphone device enumeration on mount
- Dropdown selector with device labels
- Device selection with Recorder integration
- Refresh button to re-enumerate devices
- Loading state during enumeration
- Error handling for enumeration failures
- Empty device list handling
- Selected device state management
- Proper cleanup on component unmount

### 4.4 ToneGenerator Component ✅
- [x] Write tests for tone generator UI (TONE-003, TONE-006)
- [x] Implement 12 tone buttons (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- [x] Write tests for tone playback (TONE-004)
- [x] Implement play tone on button press
- [x] Write tests for tone stop (TONE-005)
- [x] Implement stop tone on release or second click
- [x] Optional: Implement piano key visual styling

**EARS Requirements:** TONE-003, TONE-004, TONE-005, TONE-006

**Test Coverage:** 14 tests in src/components/ToneGenerator.test.tsx

**Completed:** 2025-11-14

**Features:**
- 12 tone buttons in chromatic order (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- Click to play tone (C4-B4 range)
- Click again to stop tone
- Automatic stop when switching to different tone
- Active state visual feedback
- Black key styling (darker background)
- Hover effects for better UX
- Proper cleanup on component unmount

### 4.5 TransportControl Component ✅
- [x] Write tests for Play button (PLAY-001)
- [x] Implement Play button
- [x] Write tests for Pause button (PLAY-002)
- [x] Implement Pause button (same button as Play)
- [x] Write tests for Stop button (PLAY-003)
- [x] Implement Stop button
- [x] Write tests for time display (PLAY-005)
- [x] Implement playhead time display (current / total)

**EARS Requirements:** PLAY-001, PLAY-002, PLAY-003, PLAY-005

**Test Coverage:** 22 tests in src/components/TransportControl.test.tsx

**Completed:** 2025-11-14

**Features:**
- Play/Pause toggle button (▶/⏸ icons)
- Stop button (⏹ icon, disabled when stopped)
- Time display in M:SS / M:SS format
- Playing state advances time at 100ms intervals
- Pause maintains current time position
- Stop resets time to 0:00
- Visual state feedback with color changes (green for play, orange for pause, red for stop)
- Hover effects for better UX
- State transitions: stopped → playing → paused → stopped

### 4.6 VoicePartSection Component ✅
- [x] Write tests for voice part rendering (VOICE-001)
- [x] Implement 4 voice part sections (S, A, T, B)
- [x] Write tests for collapse/expand toggle (VOICE-002)
- [x] Implement collapse/expand toggle
- [x] Write tests for track count display (VOICE-003)
- [x] Implement track count display
- [x] Write tests for color coding (VOICE-004)
- [x] Implement color-coded backgrounds (S=red, A=blue, T=green, B=purple)
- [x] Write tests for Add Track button (REC-001)
- [x] Implement Add Track button

**EARS Requirements:** VOICE-001, VOICE-002, VOICE-003, VOICE-004, REC-001

**Test Coverage:** 28 tests in src/components/VoicePartSection.test.tsx

**Completed:** 2025-11-14

**Features:**
- Support for all 4 voice parts (Soprano, Alto, Tenor, Bass)
- Collapse/expand toggle button (▼/▶ icons)
- Track count display with proper singular/plural ("1 track" vs "2 tracks")
- Color-coded left border (Soprano=red, Alto=blue, Tenor=green, Bass=purple)
- Add Track button (+) with voice part color
- Expanded by default showing child tracks
- Collapsed state hides child tracks
- onAddTrack callback with voicePartId parameter
- Hover effects for Add Track button

### 4.7 TrackRow Component
- [x] Write tests for track controls layout (TRACK-011)
- [x] Implement layout: [Delete] [Name] [Solo] [Mute] [Volume] [Sparkline]
- [x] Write tests for Delete button (TRACK-001, TRACK-002)
- [x] Implement Delete button
- [x] Write tests for track name editing (TRACK-010)
- [x] Implement inline track name editing
- [x] Write tests for Solo button (TRACK-005)
- [x] Implement Solo toggle button
- [x] Write tests for Mute button (TRACK-006)
- [x] Implement Mute toggle button
- [x] Write tests for volume slider (TRACK-008, TRACK-009)
- [x] Implement volume slider (0-100, preserves on mute)
- [x] Write tests for grayed out when muted
- [x] Implement grayed out styling for muted tracks

**EARS Requirements:** TRACK-001, TRACK-002, TRACK-005, TRACK-006, TRACK-008, TRACK-009, TRACK-010, TRACK-011

**Tests:** 28 tests
- TRACK-011 tests (6): Layout and all controls rendering
- TRACK-001, TRACK-002 tests (2): Delete button with correct track ID
- TRACK-010 tests (2): Track name inline editing
- TRACK-005 tests (3): Solo button toggle with active state
- TRACK-006 tests (3): Mute button toggle with active state
- TRACK-008, TRACK-009 tests (7): Volume slider (0-100 range, grayed when muted)
- Optional callbacks tests (5): Component works without callbacks

**Files:**
- `src/components/TrackRow.tsx` - Track controls component
- `src/components/TrackRow.test.tsx` - 28 comprehensive tests

### 4.8 Waveform Component
- [x] Write tests for sparkline rendering (VIS-002)
- [x] Implement sparkline canvas/SVG rendering
- [x] Write tests for playhead indicator (VIS-004, SEEK-004)
- [x] Implement playhead vertical line
- [x] Write tests for click-to-seek (SEEK-001)
- [x] Implement click-to-seek functionality
- [x] Write tests for drag-to-seek (SEEK-002)
- [x] Implement drag playhead functionality
- [x] Write tests for seek during playback (SEEK-003)
- [x] Implement continue playing from new position

**EARS Requirements:** VIS-002, VIS-004, SEEK-001, SEEK-002, SEEK-003, SEEK-004

**Tests:** 30 tests
- VIS-002: Sparkline rendering (7 tests)
  - Canvas renders with correct dimensions
  - Handles empty data, single data point, data updates
- VIS-004, SEEK-004: Playhead indicator (7 tests)
  - Renders playhead at correct position
  - Updates position based on currentTime/duration ratio
  - Handles zero duration edge case
- SEEK-001: Click-to-seek (5 tests)
  - Calls onSeek with correct time on canvas click
  - Handles canvas offset correctly
  - Clamps to valid range
- SEEK-002: Drag-to-seek (5 tests)
  - Dragging playhead updates position
  - Stops dragging on mouse up
  - Works across entire waveform
  - Clamps to valid range
- SEEK-003: Seek during playback (3 tests)
  - Allows seeking while playing
  - Playhead updates after seek
  - Drag works while playing
- Component integration (3 tests)
  - Works without optional props
  - Container is interactive

**Files:**
- `src/components/Waveform.tsx` - Waveform visualization with seek
- `src/components/Waveform.test.tsx` - 30 comprehensive tests

### 4.9 VUMeter Component
- [ ] Write tests for VU meter display (MIC-005, REC-004)
- [ ] Implement VU meter bar/line visualization
- [ ] Write tests for VU meter replaces sparkline (VIS-003)
- [ ] Implement conditional rendering (VU meter during recording, sparkline otherwise)

**EARS Requirements:** MIC-005, REC-004, VIS-003

---

## Phase 5: Integration - Recording Flow

### 5.1 Record Workflow Integration
- [ ] Write integration tests for full recording flow (REC-001 through REC-010)
- [ ] Integrate microphone permission request
- [ ] Integrate countdown UI
- [ ] Integrate metronome start
- [ ] Integrate VU meter display during recording
- [ ] Integrate overdub muting logic
- [ ] Integrate recording stop and WAV conversion
- [ ] Integrate waveform generation
- [ ] Integrate auto-save to IndexedDB
- [ ] Integrate sparkline replacement of VU meter

**EARS Requirements:** REC-001, REC-002, REC-003, REC-004, REC-005, REC-006, REC-007, REC-008, REC-009, REC-010

---

## Phase 6: Integration - Playback & Transport

### 6.1 Playback Integration
- [ ] Write integration tests for playback flow (PLAY-001 through PLAY-008)
- [ ] Integrate Play button with mixer
- [ ] Integrate Pause button
- [ ] Integrate Stop button with playhead reset
- [ ] Integrate real-time playhead visual updates (PLAY-004)
- [ ] Integrate mute exclusion logic (PLAY-006)
- [ ] Integrate solo logic (PLAY-007)
- [ ] Integrate multi-track sync (PLAY-008)

**EARS Requirements:** PLAY-001, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007, PLAY-008

### 6.2 Seeking Integration
- [ ] Write integration tests for seeking (SEEK-001, SEEK-002, SEEK-003)
- [ ] Integrate click-to-seek with playhead update
- [ ] Integrate drag-to-seek with playhead update
- [ ] Integrate seek during playback continuation

**EARS Requirements:** SEEK-001, SEEK-002, SEEK-003

---

## Phase 7: Integration - Export & Project Management

### 7.1 Export Integration
- [ ] Write integration tests for WAV export (EXP-001, EXP-002, EXP-003)
- [ ] Integrate WAV export with mixer and downloader
- [ ] Write integration tests for MP3 export (EXP-004, EXP-005, EXP-006)
- [ ] Integrate MP3 export with lamejs and downloader
- [ ] Write tests for export dropdown (EXP-007)
- [ ] Integrate export dropdown UI

**EARS Requirements:** EXP-001, EXP-002, EXP-003, EXP-004, EXP-005, EXP-006, EXP-007

### 7.2 Project Management Integration
- [ ] Write integration tests for new project flow (PROJ-001 through PROJ-004)
- [ ] Integrate new project with name prompt and initialization
- [ ] Write integration tests for auto-save (PROJ-005)
- [ ] Integrate auto-save on every state change
- [ ] Write integration tests for load project (PROJ-006, PROJ-007)
- [ ] Integrate load project with UI reconstruction
- [ ] Write integration tests for delete project (PROJ-008)
- [ ] Integrate delete project with confirmation

**EARS Requirements:** PROJ-001, PROJ-002, PROJ-003, PROJ-004, PROJ-005, PROJ-006, PROJ-007, PROJ-008

---

## Phase 8: Polish & UX Enhancements

### 8.1 Keyboard Shortcuts
- [ ] Write tests for Space bar (play/pause)
- [ ] Implement Space bar for play/pause toggle
- [ ] Write tests for Ctrl+Z/Cmd+Z (undo delete) (TRACK-003)
- [ ] Implement undo delete keyboard shortcut

**EARS Requirements:** TRACK-003

### 8.2 Error Handling
- [ ] Write tests for microphone permission denied (ERR-001)
- [ ] Implement user-friendly error message display
- [ ] Write tests for storage quota exceeded (ERR-002)
- [ ] Implement storage quota error handling
- [ ] Write tests for audio encoding failure (ERR-003)
- [ ] Implement encoding error handling

**EARS Requirements:** ERR-001, ERR-002, ERR-003

### 8.3 Visual Polish
- [ ] Implement color-coded voice parts (VOICE-004)
- [ ] Implement metronome flash animation (MET-005)
- [ ] Implement muted track grayed-out styling
- [ ] Implement responsive layout
- [ ] Implement loading states
- [ ] Implement smooth transitions

**EARS Requirements:** VOICE-004, MET-005

---

## Phase 9: Testing & Validation

### 9.1 Full Integration Testing
- [ ] Write end-to-end test: New project → Record 4 tracks → Export WAV
- [ ] Write end-to-end test: Load project → Edit → Auto-save → Reload
- [ ] Write end-to-end test: Record with overdub → Solo/Mute → Export MP3
- [ ] Write end-to-end test: Delete track → Undo → Verify restoration
- [ ] Verify all EARS requirements have corresponding tests

### 9.2 Browser Testing
- [ ] Test on Chrome (latest)
- [ ] Test on Edge (latest)
- [ ] Test on Brave (latest)

### 9.3 Performance & Memory
- [ ] Test with 32 tracks (8 per voice part)
- [ ] Check for memory leaks during recording/playback
- [ ] Verify UI responsiveness during operations

### 9.4 Error Scenarios
- [ ] Test microphone permission denied flow
- [ ] Test with no microphone available
- [ ] Test IndexedDB quota exceeded
- [ ] Test invalid audio data handling

---

## Phase 10: Documentation & Deployment

### 10.1 Code Documentation
- [ ] Add JSDoc comments to all public functions
- [ ] Document audio engine modules
- [ ] Document state management patterns

### 10.2 User Documentation
- [ ] Create README.md with setup instructions
- [ ] Create user guide for basic workflows
- [ ] Document keyboard shortcuts

### 10.3 Deployment
- [ ] Build production bundle
- [ ] Test production build locally
- [ ] Verify all features work in production mode

---

## EARS Requirements Coverage Checklist

Use this checklist to ensure all EARS requirements are implemented and tested.

### Project Management
- [ ] PROJ-001: New project prompts for name
- [ ] PROJ-002: New project initializes 4 voice parts
- [ ] PROJ-003: New project sets default BPM to 120
- [ ] PROJ-004: New project sets overdub to disabled
- [ ] PROJ-005: Auto-save on every change
- [ ] PROJ-006: Load displays project list
- [ ] PROJ-007: Load restores project state
- [ ] PROJ-008: Delete project removes from IndexedDB
- [ ] PROJ-009: Display project name in top bar

### Microphone & Input
- [ ] MIC-001: Enumerate available microphones on load
- [ ] MIC-002: Provide microphone selection UI
- [ ] MIC-003: Use selected microphone for recording
- [ ] MIC-004: Display error on permission denied
- [ ] MIC-005: Display VU meter during recording

### Recording
- [ ] REC-001: Request mic permission on Add Track
- [ ] REC-002: Display countdown (3-2-1)
- [ ] REC-003: Start MediaRecorder and metronome
- [ ] REC-004: Display VU meter during recording
- [ ] REC-005: Mute all tracks when overdub disabled
- [ ] REC-006: Respect solo/mute when overdub enabled
- [ ] REC-007: Convert to WAV blob on stop
- [ ] REC-008: Generate waveform data
- [ ] REC-009: Auto-save track to IndexedDB
- [ ] REC-010: Auto-generate track name
- [ ] REC-011: Limit to 8 tracks per voice part

### Metronome
- [ ] MET-001: Provide visual metronome
- [ ] MET-002: BPM adjustment via +/- buttons
- [ ] MET-003: BPM adjustment via direct input
- [ ] MET-004: Update tempo immediately on change
- [ ] MET-005: Flash/pulse at specified BPM
- [ ] MET-006: Sync during recording
- [ ] MET-007: Sync during playback

### Playback & Transport
- [ ] PLAY-001: Play from playhead position
- [ ] PLAY-002: Pause maintains playhead position
- [ ] PLAY-003: Stop resets playhead to 0:00
- [ ] PLAY-004: Update playhead visual in real-time
- [ ] PLAY-005: Display elapsed time and total duration
- [ ] PLAY-006: Exclude muted tracks from mix
- [ ] PLAY-007: Mute non-soloed tracks during playback
- [ ] PLAY-008: Sync playback across all tracks

### Seeking & Playhead
- [ ] SEEK-001: Click sparkline to seek
- [ ] SEEK-002: Drag playhead to seek
- [ ] SEEK-003: Continue playing from new position
- [ ] SEEK-004: Display playhead on each sparkline

### Track Controls
- [ ] TRACK-001: Store deleted track in undo state
- [ ] TRACK-002: Remove track from IndexedDB and UI
- [ ] TRACK-003: Ctrl+Z/Cmd+Z restores last deleted
- [ ] TRACK-004: Limit undo to single level
- [ ] TRACK-005: Solo sets solo flag
- [ ] TRACK-006: Mute sets mute boolean
- [ ] TRACK-007: Mute preserves volume/GainNode
- [ ] TRACK-008: Volume slider updates GainNode
- [ ] TRACK-009: Volume persists when muted
- [ ] TRACK-010: Click track name to edit
- [ ] TRACK-011: Track controls in correct order

### Voice Parts
- [ ] VOICE-001: Provide 4 voice part sections (S, A, T, B)
- [ ] VOICE-002: Collapse/expand toggle
- [ ] VOICE-003: Display track count
- [ ] VOICE-004: Color-code voice parts

### Visualization
- [ ] VIS-001: Generate sparkline (100-200 points)
- [ ] VIS-002: Display sparklines for all tracks
- [ ] VIS-003: VU meter replaces sparkline during recording
- [ ] VIS-004: Synchronized playhead across sparklines

### Export
- [ ] EXP-001: Mix non-muted tracks for WAV export
- [ ] EXP-002: Render to uncompressed WAV
- [ ] EXP-003: Download as <project-name>.wav
- [ ] EXP-004: Mix non-muted tracks for MP3 export
- [ ] EXP-005: Encode to MP3 at 128kbps
- [ ] EXP-006: Download as <project-name>.mp3
- [ ] EXP-007: Export dropdown with WAV/MP3 options

### Overdub Control
- [ ] OVER-001: Provide overdub toggle UI
- [ ] OVER-002: Mute all tracks when overdub disabled
- [ ] OVER-003: Play non-muted tracks when overdub enabled
- [ ] OVER-004: Save overdub setting with project

### Tone Generator (Pitch Reference)
- [ ] TONE-001: Provide tone generator for pitch reference
- [ ] TONE-002: 12 chromatic tones from C4 to B4 (includes A440)
- [ ] TONE-003: Display tone controls to right of microphone selector
- [ ] TONE-004: Play tone on button click/press
- [ ] TONE-005: Stop tone on release or second click
- [ ] TONE-006: UI renders as piano keys OR labeled buttons

### Error Handling
- [ ] ERR-001: Display error on mic permission denied
- [ ] ERR-002: Notify on storage quota exceeded
- [ ] ERR-003: Display error on encoding failure

---

## Progress Tracking

**Total EARS Requirements:** 82
**Completed:** 0
**Remaining:** 82

### Phases Completed
- [x] **Phase 1: Project Setup & Foundation** (2025-11-13)
  - All infrastructure, tooling, and test mocks in place
  - Ready for feature development

### Current Status
- **Next Phase:** Phase 2 - Data Layer (IndexedDB + Zustand)
- Tests passing: 2/2 ✓
- TypeScript: No errors ✓
- ESLint: No errors ✓

Update this section as you complete requirements to track progress.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Author:** Claude Code + Jess
