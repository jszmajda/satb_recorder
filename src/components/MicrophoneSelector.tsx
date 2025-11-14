// [EARS: MIC-002, MIC-003] Microphone device selector with enumeration and selection

import { useState, useEffect, useRef } from 'react';
import { Recorder } from '../audio/recorder';

interface MicrophoneDevice {
  deviceId: string;
  label: string;
}

export function MicrophoneSelector() {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Initialize recorder and enumerate devices on mount
   * [EARS: MIC-002] Enumerate devices on component load
   */
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    recorderRef.current = new Recorder(audioContextRef.current);

    // Initial device enumeration
    enumerateDevices();

    // Cleanup on unmount
    return () => {
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Enumerate microphone devices
   * [EARS: MIC-002] List all available microphones
   */
  const enumerateDevices = async () => {
    if (!recorderRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const deviceList = await recorderRef.current.enumerateDevices();
      setDevices(deviceList);

      // Check if there's already a selected device
      const currentDevice = recorderRef.current.getSelectedDevice();
      if (currentDevice) {
        setSelectedDeviceId(currentDevice);
      }
    } catch (err) {
      setError('Error loading microphones');
      console.error('Failed to enumerate devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle device selection change
   * [EARS: MIC-003] Select a specific microphone device
   */
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;

    if (!recorderRef.current) return;

    if (deviceId === '') {
      // Clear selection
      recorderRef.current.selectDevice(null);
      setSelectedDeviceId(null);
    } else {
      // Select device (pass the ID as-is, even if it doesn't exist in the list)
      // The Recorder class will handle invalid IDs
      recorderRef.current.selectDevice(deviceId);
      setSelectedDeviceId(deviceId);
    }
  };

  /**
   * Handle refresh button click
   * [EARS: MIC-002] Re-enumerate devices
   */
  const handleRefresh = () => {
    enumerateDevices();
  };

  return (
    <div
      className="microphone-selector"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '8px',
      }}
    >
      {/* Device Selector Dropdown */}
      {/* [EARS: MIC-002, MIC-003] Microphone selection dropdown */}
      <div style={{ flex: 1 }}>
        <select
          value={selectedDeviceId || ''}
          onChange={handleDeviceChange}
          disabled={isLoading || error !== null}
          aria-label="Microphone"
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '0.9rem',
            backgroundColor: '#444',
            color: '#fff',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: isLoading || error !== null ? 'not-allowed' : 'pointer',
          }}
        >
          {/* Loading state */}
          {isLoading && <option value="">Loading microphones...</option>}

          {/* Error state */}
          {error && <option value="">Error loading microphones</option>}

          {/* No devices found */}
          {!isLoading && !error && devices.length === 0 && (
            <option value="">No microphones found</option>
          )}

          {/* Normal state with devices */}
          {!isLoading && !error && devices.length > 0 && (
            <>
              <option value="">Select a microphone</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Refresh Button */}
      {/* [EARS: MIC-002] Refresh device list */}
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        aria-label="Refresh microphones"
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: isLoading ? '#666' : '#2196f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '0.9rem',
        }}
      >
        Refresh
      </button>
    </div>
  );
}
