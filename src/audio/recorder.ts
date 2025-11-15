// [EARS: MIC-001 through MIC-004, REC-001 through REC-007, ERR-001, ERR-003] Audio recorder with device management

export interface RecordingResult {
  audioBlob: Blob;
  duration: number;
  waveformData: number[];
}

/**
 * Audio recorder for capturing microphone input using AudioWorklet
 * [EARS: MIC-001, MIC-002, MIC-003, MIC-004, REC-001 through REC-007, ERR-001, ERR-003]
 */
export class Recorder {
  private selectedDeviceId: string | null = null;
  private hasPermissionGranted: boolean = false;
  private currentStream: MediaStream | null = null;
  private recording: boolean = false;
  private audioContext: AudioContext | null = null;
  private recorderNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private recordingError: Error | null = null;
  private recordedData: Float32Array[] | null = null;
  private recordingSampleRate: number = 0;
  private recordingDuration: number = 0;

  /**
   * Create a new Recorder
   */
  constructor() {
    // Initialize recorder
  }

  /**
   * Enumerate available microphone devices
   * [EARS: MIC-001] Enumerate all available microphone devices
   *
   * @returns Array of audio input devices
   */
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Filter for audio input devices only
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get currently selected device ID
   * [EARS: MIC-002] Device selection tracking
   *
   * @returns Selected device ID or null
   */
  getSelectedDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  /**
   * Set selected microphone device
   * [EARS: MIC-002, MIC-003] Device selection and usage
   *
   * @param deviceId - Device ID to select, or null to clear selection
   */
  setSelectedDevice(deviceId: string | null): void {
    this.selectedDeviceId = deviceId;
  }

  /**
   * Check if microphone permission has been granted
   *
   * @returns True if permission granted
   */
  hasPermission(): boolean {
    return this.hasPermissionGranted;
  }

  /**
   * Request microphone access
   * [EARS: REC-001] Request microphone permissions
   * [EARS: MIC-003] Use selected device for recording
   * [EARS: MIC-004, ERR-001] Handle permission errors
   *
   * @returns MediaStream from microphone
   * @throws Error if permission denied or device not available
   */
  async requestMicrophoneAccess(): Promise<MediaStream> {
    // Stop previous stream if exists
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    try {
      // Build constraints based on selected device
      // Disable echo cancellation, auto gain, and noise suppression for clean recording
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
      };

      if (this.selectedDeviceId) {
        audioConstraints.deviceId = { exact: this.selectedDeviceId };
      }

      const constraints: MediaStreamConstraints = {
        audio: audioConstraints
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.currentStream = stream;
      this.hasPermissionGranted = true;

      return stream;
    } catch (error) {
      // Handle specific error types
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Microphone permission denied');
          case 'NotFoundError':
            throw new Error('Microphone device not found');
          case 'NotReadableError':
            throw new Error('Microphone device is already in use');
          default:
            throw new Error('Failed to access microphone');
        }
      }

      // Re-throw other errors
      throw new Error('Failed to access microphone');
    }
  }

  /**
   * Check if currently recording
   *
   * @returns True if recording is active
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Start recording immediately using AudioWorklet
   * [EARS: REC-003] Start audio recording
   * Note: Countdown is now handled by the UI component
   *
   * @param stream - MediaStream to record from
   * @throws Error if already recording or stream not provided
   */
  async startRecording(stream: MediaStream): Promise<void> {
    if (this.recording) {
      throw new Error('Already recording');
    }

    if (!stream) {
      throw new Error('MediaStream required for recording');
    }

    // Update current stream reference
    this.currentStream = stream;

    try {
      // Create AudioContext if not exists
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Resume context if suspended (required in some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load AudioWorklet processor module
      try {
        await this.audioContext.audioWorklet.addModule('/recorder-processor.js');
      } catch (error) {
        // Module might already be loaded, ignore error
      }

      // Create AudioWorklet node
      this.recorderNode = new AudioWorkletNode(this.audioContext, 'recorder-processor');

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Connect: source -> recorder node
      this.sourceNode.connect(this.recorderNode);

      // Set up message handler to receive recorded data
      this.recorderNode.port.onmessage = (event) => {
        const { samples, sampleRate, duration } = event.data;
        this.recordedData = samples;
        this.recordingSampleRate = sampleRate;
        this.recordingDuration = duration;
      };

      // Start recording
      this.recorderNode.port.postMessage({
        command: 'start',
        sampleRate: this.audioContext.sampleRate
      });

      this.recording = true;
      this.recordingError = null;
    } catch (error) {
      this.recording = false;
      throw new Error('Failed to start recording');
    }
  }

  /**
   * Stop recording and return audio data
   * [EARS: REC-007] Convert audio to WAV blob
   * [EARS: ERR-003] Handle encoding errors
   *
   * @returns Recording result with audio blob, duration, and waveform data
   * @throws Error if encoding fails
   */
  async stopRecording(): Promise<RecordingResult> {
    if (!this.recording || !this.recorderNode) {
      // Not recording, return empty result
      return {
        audioBlob: new Blob([], { type: 'audio/wav' }),
        duration: 0,
        waveformData: [],
      };
    }

    return new Promise((resolve, reject) => {
      // Wait for data from processor
      const handleData = () => {
        try {
          if (!this.recordedData) {
            throw new Error('No recorded data received');
          }

          // Convert Float32Array[] to WAV blob
          const wavBlob = this.convertToWav(
            this.recordedData,
            this.recordingSampleRate
          );

          // Generate simple waveform data (sample every ~100 samples for visualization)
          const waveformData = this.generateWaveformData(this.recordedData);

          this.recording = false;

          // Clean up
          if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
          }
          if (this.recorderNode) {
            this.recorderNode.disconnect();
            this.recorderNode = null;
          }

          this.recordedData = null;

          resolve({
            audioBlob: wavBlob,
            duration: this.recordingDuration,
            waveformData,
          });
        } catch (error) {
          this.recording = false;
          reject(new Error('Recording failed'));
        }
      };

      // Request stop and wait for data
      if (this.recorderNode) {
        this.recorderNode.port.postMessage({ command: 'stop' });

        // Wait a bit for the data to arrive
        setTimeout(() => {
          handleData();
        }, 100);
      } else {
        reject(new Error('Recording failed'));
      }
    });
  }

  /**
   * Convert Float32Array samples to WAV blob
   * @private
   */
  private convertToWav(samples: Float32Array[], sampleRate: number): Blob {
    // Flatten all sample arrays into one
    const totalLength = samples.reduce((sum, arr) => sum + arr.length, 0);
    const allSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of samples) {
      allSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert Float32 (-1 to 1) to Int16 (-32768 to 32767)
    const int16Data = new Int16Array(allSamples.length);
    for (let i = 0; i < allSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, allSamples[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Create WAV file
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = int16Data.length * 2;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const dataOffset = 44;
    for (let i = 0; i < int16Data.length; i++) {
      view.setInt16(dataOffset + i * 2, int16Data[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Generate waveform data for visualization
   * @private
   */
  private generateWaveformData(samples: Float32Array[]): number[] {
    // Flatten samples
    const totalLength = samples.reduce((sum, arr) => sum + arr.length, 0);
    const allSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of samples) {
      allSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Sample every ~100 samples for waveform visualization
    const waveformData: number[] = [];
    const step = Math.max(1, Math.floor(allSamples.length / 1000));

    for (let i = 0; i < allSamples.length; i += step) {
      waveformData.push(Math.abs(allSamples[i]));
    }

    return waveformData;
  }

  /**
   * Dispose of resources and stop active streams
   */
  dispose(): void {
    // Stop recording if active
    if (this.recording && this.recorderNode) {
      this.recorderNode.port.postMessage({ command: 'stop' });
      this.recording = false;
    }

    // Disconnect nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.recorderNode) {
      this.recorderNode.disconnect();
      this.recorderNode = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    this.hasPermissionGranted = false;
    this.selectedDeviceId = null;
    this.recordedData = null;
  }
}
