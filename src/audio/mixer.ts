// [EARS: TRACK-005, TRACK-006, TRACK-007, TRACK-008, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007] Mixer for multi-track playback

interface TrackState {
  audioBuffer: AudioBuffer;
  gainNode: GainNode;
  volume: number; // 0-100
  muted: boolean;
  soloed: boolean;
  bufferSource: AudioBufferSourceNode | null;
}

interface PlaybackState {
  startTime: number; // AudioContext time when playback started
  offsetTime: number; // Offset into the audio buffer
}

/**
 * Mixer for multi-track audio playback
 * [EARS: TRACK-005, TRACK-006, TRACK-007, TRACK-008, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007, SEEK-001, SEEK-002, SEEK-003]
 */
export class Mixer {
  private audioContext: AudioContext;
  private tracks: Map<string, TrackState> = new Map();
  private playing: boolean = false;
  private playbackState: PlaybackState | null = null;
  private masterGain: GainNode;

  /**
   * Create a new Mixer
   * [EARS: PLAY-002] Initialize mixer for multi-track playback
   *
   * @param audioContext - Web Audio API AudioContext
   */
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;

    // Create master gain node for automatic gain reduction
    this.masterGain = audioContext.createGain();
    this.masterGain.connect(audioContext.destination);
    this.masterGain.gain.value = 1.0;
  }

  /**
   * Load a track from an audio blob
   * [EARS: PLAY-002] Load tracks for playback
   *
   * @param trackId - Unique identifier for the track
   * @param audioBlob - Audio blob to load
   * @throws Error if audio decoding fails
   */
  async loadTrack(trackId: string, audioBlob: Blob): Promise<void> {
    try {
      // If track already exists, unload it first
      if (this.tracks.has(trackId)) {
        this.unloadTrack(trackId);
      }

      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create GainNode for this track
      const gainNode = this.audioContext.createGain();
      gainNode.connect(this.masterGain);

      // Create track state
      const trackState: TrackState = {
        audioBuffer,
        gainNode,
        volume: 100,
        muted: false,
        soloed: false,
        bufferSource: null,
      };

      // Update gain based on initial state
      this.updateGain(trackState);

      // Store track
      this.tracks.set(trackId, trackState);

      // Update master gain for new track count
      this.updateMasterGain();
    } catch (error) {
      throw new Error('Failed to load track');
    }
  }

  /**
   * Unload a track
   * [EARS: PLAY-002] Remove tracks from mixer
   *
   * @param trackId - Track identifier to unload
   */
  unloadTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      return;
    }

    // Stop if playing
    if (track.bufferSource) {
      track.bufferSource.stop();
      track.bufferSource.disconnect();
      track.bufferSource = null;
    }

    // Disconnect gain node
    track.gainNode.disconnect();

    // Remove from tracks
    this.tracks.delete(trackId);

    // Update master gain for new track count
    this.updateMasterGain();
  }

  /**
   * Get all track IDs
   * [EARS: PLAY-002] Query loaded tracks
   *
   * @returns Array of track IDs
   */
  getTrackIds(): string[] {
    return Array.from(this.tracks.keys());
  }

  /**
   * Set track volume
   * [EARS: TRACK-008] Volume slider updates GainNode
   *
   * @param trackId - Track identifier
   * @param volume - Volume level (0-100)
   */
  setVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      return;
    }

    // Clamp volume to 0-100
    track.volume = Math.max(0, Math.min(100, volume));

    // Update gain node
    this.updateGain(track);
  }

  /**
   * Get track volume
   * [EARS: TRACK-008, TRACK-009] Query volume setting
   *
   * @param trackId - Track identifier
   * @returns Volume level (0-100), or 100 if track not found
   */
  getVolume(trackId: string): number {
    const track = this.tracks.get(trackId);
    return track ? track.volume : 100;
  }

  /**
   * Set track mute state
   * [EARS: TRACK-006, TRACK-007] Mute track while preserving volume
   *
   * @param trackId - Track identifier
   * @param muted - Mute state
   */
  setMuted(trackId: string, muted: boolean): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      return;
    }

    track.muted = muted;

    // Update gain node
    this.updateGain(track);

    // Update master gain for new active track count
    this.updateMasterGain();
  }

  /**
   * Get track mute state
   * [EARS: TRACK-006] Query mute state
   *
   * @param trackId - Track identifier
   * @returns Mute state, or false if track not found
   */
  isMuted(trackId: string): boolean {
    const track = this.tracks.get(trackId);
    return track ? track.muted : false;
  }

  /**
   * Set track solo state
   * [EARS: TRACK-005, PLAY-007] Solo track (only soloed tracks play)
   *
   * @param trackId - Track identifier
   * @param soloed - Solo state
   */
  setSoloed(trackId: string, soloed: boolean): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      return;
    }

    track.soloed = soloed;

    // Update all track gains (solo affects all tracks)
    // Gain will be adjusted in real-time without stopping playback
    this.updateAllGains();
  }

  /**
   * Get track solo state
   * [EARS: TRACK-005] Query solo state
   *
   * @param trackId - Track identifier
   * @returns Solo state, or false if track not found
   */
  isSoloed(trackId: string): boolean {
    const track = this.tracks.get(trackId);
    return track ? track.soloed : false;
  }

  /**
   * Start playback of all tracks
   * [EARS: PLAY-002, PLAY-003, PLAY-006, PLAY-007, SEEK-002] Play all tracks, use gain for mute/solo
   */
  play(): void {
    if (this.playing) {
      // Already playing, stop first
      this.stop();
    }

    // Get the current offset (or 0 if no playback state)
    const offset = this.playbackState?.offsetTime ?? 0;

    // Update master gain before starting playback
    this.updateMasterGain();

    // Create buffer sources for ALL tracks
    // Gain nodes will control which ones are actually audible
    for (const [trackId, track] of this.tracks.entries()) {
      // Create buffer source
      const bufferSource = this.audioContext.createBufferSource();
      bufferSource.buffer = track.audioBuffer;

      // Connect to gain node
      bufferSource.connect(track.gainNode);

      // Start playback from the current offset
      // [EARS: SEEK-002] Resume playback from seek position
      bufferSource.start(0, offset);

      // Store reference
      track.bufferSource = bufferSource;
    }

    // Update playback state
    this.playbackState = {
      startTime: this.audioContext.currentTime,
      offsetTime: offset,
    };

    this.playing = true;
  }

  /**
   * Stop playback
   * [EARS: PLAY-002, PLAY-005, SEEK-002] Stop playback and preserve position
   */
  stop(): void {
    if (!this.playing) {
      return;
    }

    // Calculate current playback position before stopping
    // [EARS: SEEK-002] Preserve playback position when pausing
    if (this.playbackState) {
      const elapsed = this.audioContext.currentTime - this.playbackState.startTime;
      this.playbackState.offsetTime += elapsed;
    }

    // Stop all buffer sources
    for (const track of this.tracks.values()) {
      if (track.bufferSource) {
        try {
          track.bufferSource.stop();
          track.bufferSource.disconnect();
        } catch (e) {
          // Ignore errors from stopping already-stopped sources
        }
        track.bufferSource = null;
      }
    }

    this.playing = false;
  }

  /**
   * Check if mixer is playing
   * [EARS: PLAY-002] Query playback state
   *
   * @returns True if playing
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Seek to a specific time position
   * [EARS: SEEK-001, SEEK-002, SEEK-003] Jump to specific playback position
   *
   * @param time - Time in seconds to seek to
   */
  seek(time: number): void {
    const wasPlaying = this.playing;

    // Stop if currently playing
    if (wasPlaying) {
      this.stop();
    }

    // Update playback state with new offset
    this.playbackState = {
      startTime: this.audioContext.currentTime,
      offsetTime: Math.max(0, time), // Clamp to >= 0
    };

    // Resume playback if we were playing
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Get current playback time
   * [EARS: SEEK-001] Query current playback position
   *
   * @returns Current playback time in seconds
   */
  getCurrentTime(): number {
    if (!this.playbackState) {
      return 0;
    }

    if (this.playing) {
      // Calculate current position based on elapsed time
      const elapsed = this.audioContext.currentTime - this.playbackState.startTime;
      return this.playbackState.offsetTime + elapsed;
    } else {
      // Return the stored offset when paused/stopped
      return this.playbackState.offsetTime;
    }
  }

  /**
   * Update gain for a single track based on volume, mute, and solo state
   * [EARS: TRACK-006, TRACK-007, TRACK-008, PLAY-006, PLAY-007]
   *
   * @param track - Track state to update
   */
  private updateGain(track: TrackState): void {
    // Check if any tracks are soloed
    const hasSolo = Array.from(this.tracks.values()).some(t => t.soloed);

    let gain = 0;

    if (hasSolo) {
      // If any track is soloed, only soloed tracks are audible
      if (track.soloed) {
        // Soloed track: use volume setting (ignore mute)
        gain = track.volume / 100;
      } else {
        // Not soloed: silent
        gain = 0;
      }
    } else {
      // No solo: respect mute
      if (track.muted) {
        gain = 0;
      } else {
        gain = track.volume / 100;
      }
    }

    track.gainNode.gain.value = gain;
  }

  /**
   * Update gain for all tracks (used when solo state changes)
   * [EARS: PLAY-007]
   */
  private updateAllGains(): void {
    for (const track of this.tracks.values()) {
      this.updateGain(track);
    }
    // Update master gain to prevent clipping
    this.updateMasterGain();
  }

  /**
   * Update master gain to prevent clipping when multiple tracks play
   * Uses 1/sqrt(N) scaling where N is the number of active tracks
   */
  private updateMasterGain(): void {
    // Count tracks that will be audible (not muted/silenced by solo)
    const hasSolo = Array.from(this.tracks.values()).some(t => t.soloed);

    let activeTrackCount = 0;
    for (const track of this.tracks.values()) {
      if (hasSolo) {
        // Only soloed tracks are active
        if (track.soloed) {
          activeTrackCount++;
        }
      } else {
        // Non-muted tracks are active
        if (!track.muted) {
          activeTrackCount++;
        }
      }
    }

    // Apply gain reduction to prevent clipping
    // Use 1/sqrt(N) scaling - better than 1/N as it's less aggressive
    // but still prevents clipping in most cases
    let masterGain = 1.0;
    if (activeTrackCount > 1) {
      masterGain = 1.0 / Math.sqrt(activeTrackCount);
    }

    this.masterGain.gain.value = masterGain;
  }

  /**
   * Dispose of all resources
   * [EARS: PLAY-002] Clean up mixer resources
   */
  dispose(): void {
    // Stop playback if playing
    this.stop();

    // Unload all tracks
    const trackIds = Array.from(this.tracks.keys());
    for (const trackId of trackIds) {
      this.unloadTrack(trackId);
    }
  }
}
