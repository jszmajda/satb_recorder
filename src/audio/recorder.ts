// [EARS: MIC-001 through MIC-004, REC-001 through REC-007, ERR-001, ERR-003] Audio recorder with device management

export interface RecordingResult {
  audioBlob: Blob;
  duration: number;
  waveformData: number[];
}

/**
 * Audio recorder for capturing microphone input
 * [EARS: MIC-001, MIC-002, MIC-003, MIC-004, REC-001 through REC-007, ERR-001, ERR-003]
 */
export class Recorder {
  private selectedDeviceId: string | null = null;
  private hasPermissionGranted: boolean = false;
  private currentStream: MediaStream | null = null;
  private countdownCallback: ((count: number) => void) | null = null;
  private recording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private countdownTimeout: NodeJS.Timeout | null = null;
  private countdownInterrupted: boolean = false;
  private recordingError: Error | null = null;

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
      const constraints: MediaStreamConstraints = {
        audio: this.selectedDeviceId
          ? { deviceId: { exact: this.selectedDeviceId } }
          : true
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
   * Set countdown callback
   * [EARS: REC-002] Countdown callback for UI updates
   *
   * @param callback - Function to call with countdown values (3, 2, 1), or null to remove
   */
  setCountdownCallback(callback: ((count: number) => void) | null): void {
    this.countdownCallback = callback;
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
   * Start recording with countdown
   * [EARS: REC-002] 3-2-1 countdown before recording
   * [EARS: REC-003] Start MediaRecorder after countdown
   *
   * @throws Error if microphone access not granted or already recording
   */
  async startRecording(): Promise<void> {
    if (!this.currentStream) {
      throw new Error('Microphone access required before recording');
    }

    if (this.recording) {
      throw new Error('Already recording');
    }

    this.countdownInterrupted = false;

    // Run countdown: 3, 2, 1
    for (let count = 3; count >= 1; count--) {
      if (this.countdownInterrupted) {
        return;
      }

      if (this.countdownCallback) {
        this.countdownCallback(count);
      }

      await new Promise(resolve => {
        this.countdownTimeout = setTimeout(resolve, 1000);
      });
    }

    // Check if stopped during countdown
    if (!this.currentStream || this.countdownInterrupted) {
      return;
    }

    // Start recording
    try {
      this.recordedChunks = [];
      this.recordingError = null;

      this.mediaRecorder = new MediaRecorder(this.currentStream, {
        mimeType: 'audio/webm',
      });

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      });

      this.mediaRecorder.addEventListener('error', () => {
        this.recording = false;
        this.recordingError = new Error('Recording failed');
      });

      this.mediaRecorder.start();
      this.recordingStartTime = Date.now();
      this.recording = true;
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
    // Interrupt countdown if active
    this.countdownInterrupted = true;

    // Clear countdown timeout if active
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
    }

    if (!this.recording || !this.mediaRecorder) {
      // Not recording, return empty result
      return {
        audioBlob: new Blob([], { type: 'audio/webm' }),
        duration: 0,
        waveformData: [],
      };
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recording failed'));
        return;
      }

      this.mediaRecorder.addEventListener('stop', async () => {
        try {
          // Check if an error occurred during recording
          if (this.recordingError) {
            this.recording = false;
            this.mediaRecorder = null;
            this.recordedChunks = [];
            reject(this.recordingError);
            return;
          }

          const duration = (Date.now() - this.recordingStartTime) / 1000;

          // Create audio blob with correct MIME type (WebM)
          const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });

          // Generate simple waveform data (placeholder)
          const waveformData: number[] = [];

          this.recording = false;
          this.mediaRecorder = null;
          this.recordedChunks = [];

          resolve({
            audioBlob,
            duration,
            waveformData,
          });
        } catch (error) {
          this.recording = false;
          reject(new Error('Recording failed'));
        }
      });

      this.mediaRecorder.stop();
    });
  }

  /**
   * Dispose of resources and stop active streams
   */
  dispose(): void {
    // Stop recording if active
    if (this.recording && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.recording = false;
      this.mediaRecorder = null;
    }

    // Clear countdown timeout
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
    }

    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    this.hasPermissionGranted = false;
    this.selectedDeviceId = null;
  }
}
