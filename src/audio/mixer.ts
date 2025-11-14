// [EARS: TRACK-005, TRACK-006, TRACK-007, TRACK-008, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007] Mixer for multi-track playback

interface TrackState {
  audioBuffer: AudioBuffer;
  gainNode: GainNode;
  volume: number; // 0-100
  muted: boolean;
  soloed: boolean;
  bufferSource: AudioBufferSourceNode | null;
}

/**
 * Mixer for multi-track audio playback
 * [EARS: TRACK-005, TRACK-006, TRACK-007, TRACK-008, PLAY-002, PLAY-003, PLAY-004, PLAY-005, PLAY-006, PLAY-007]
 */
export class Mixer {
  private audioContext: AudioContext;
  private tracks: Map<string, TrackState> = new Map();
  private playing: boolean = false;

  /**
   * Create a new Mixer
   * [EARS: PLAY-002] Initialize mixer for multi-track playback
   *
   * @param audioContext - Web Audio API AudioContext
   */
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
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
      gainNode.connect(this.audioContext.destination);

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
   * [EARS: PLAY-002, PLAY-003, PLAY-006, PLAY-007] Play non-muted tracks (or soloed tracks if any)
   */
  play(): void {
    if (this.playing) {
      // Already playing, stop first
      this.stop();
    }

    // Check if any tracks are soloed
    const hasSolo = Array.from(this.tracks.values()).some(track => track.soloed);

    // Create buffer sources for each track that should play
    for (const [trackId, track] of this.tracks.entries()) {
      let shouldPlay = false;

      if (hasSolo) {
        // If any track is soloed, only play soloed tracks
        shouldPlay = track.soloed;
      } else {
        // Otherwise, play all non-muted tracks
        shouldPlay = !track.muted;
      }

      if (shouldPlay) {
        // Create buffer source
        const bufferSource = this.audioContext.createBufferSource();
        bufferSource.buffer = track.audioBuffer;

        // Connect to gain node
        bufferSource.connect(track.gainNode);

        // Start playback
        bufferSource.start(0);

        // Store reference
        track.bufferSource = bufferSource;
      }
    }

    this.playing = true;
  }

  /**
   * Stop playback
   * [EARS: PLAY-002, PLAY-005] Stop playback
   */
  stop(): void {
    if (!this.playing) {
      return;
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
