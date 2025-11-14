// [EARS: MIC-005, REC-004, VIS-003] VU meter for real-time input monitoring

/**
 * VU Meter for real-time audio level monitoring
 * [EARS: MIC-005, REC-004, VIS-003]
 */
export class VUMeter {
  private audioContext: AudioContext;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamSourceNode | null = null;
  private timeDomainData: Uint8Array | null = null;
  private connected: boolean = false;

  /**
   * Create a new VU Meter
   * [EARS: MIC-005] Initialize with audio context for input monitoring
   *
   * @param audioContext - Web Audio API AudioContext
   */
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Connect VU meter to a MediaStream
   * [EARS: MIC-005, REC-004] Connect to microphone stream for monitoring
   *
   * @param stream - MediaStream from microphone
   */
  connect(stream: MediaStream): void {
    // Disconnect existing connection if any
    if (this.connected) {
      this.disconnect();
    }

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create buffer for time domain data
    this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);

    // Create media stream source and connect to analyser
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.mediaStreamSource.connect(this.analyser);

    // Note: We don't connect to destination to avoid feedback
    // The analyser just monitors the signal

    this.connected = true;
  }

  /**
   * Disconnect VU meter from stream
   * [EARS: MIC-005] Stop monitoring input
   */
  disconnect(): void {
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    this.analyser = null;
    this.timeDomainData = null;
    this.connected = false;
  }

  /**
   * Check if VU meter is connected to a stream
   * [EARS: MIC-005] Query connection state
   *
   * @returns True if connected to a stream
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current volume level
   * [EARS: VIS-003, REC-004] Real-time volume level for visualization
   *
   * @returns Normalized volume level (0-1)
   */
  getVolume(): number {
    if (!this.connected || !this.analyser || !this.timeDomainData) {
      return 0;
    }

    // Get time domain data
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    // Calculate RMS (root mean square) for volume level
    let sum = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      // Convert from 0-255 to -1 to 1
      const normalized = (this.timeDomainData[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / this.timeDomainData.length);

    // Normalize to 0-1 range
    // RMS for full-scale sine wave is ~0.707, so we scale accordingly
    const volume = Math.min(rms * 1.4, 1.0);

    return volume;
  }

  /**
   * Dispose of resources
   * [EARS: MIC-005] Clean up audio resources
   */
  dispose(): void {
    this.disconnect();
  }
}
