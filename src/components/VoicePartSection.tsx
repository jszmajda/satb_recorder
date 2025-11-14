// [EARS: VOICE-001, VOICE-002, VOICE-003, VOICE-004, REC-001] Voice part section with tracks

import { useState, ReactNode } from 'react';

type VoicePartColor = 'red' | 'blue' | 'green' | 'purple';

interface VoicePartSectionProps {
  voicePartId: string;
  name: string;
  color: VoicePartColor;
  trackCount: number;
  children?: ReactNode;
  onAddTrack?: (voicePartId: string) => void;
}

/**
 * Get color value for voice part
 */
function getColorValue(color: VoicePartColor): string {
  const colorMap = {
    red: '#f44336',
    blue: '#2196f3',
    green: '#4caf50',
    purple: '#9c27b0',
  };
  return colorMap[color];
}

/**
 * Voice part section component
 * [EARS: VOICE-001] Displays one of 4 voice parts (S, A, T, B)
 */
export function VoicePartSection({
  voicePartId,
  name,
  color,
  trackCount,
  children,
  onAddTrack,
}: VoicePartSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  /**
   * Handle collapse/expand toggle
   * [EARS: VOICE-002] Hide/show tracks for voice part
   */
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  /**
   * Handle add track button click
   * [EARS: REC-001] Add track to voice part
   */
  const handleAddTrack = () => {
    if (onAddTrack) {
      onAddTrack(voicePartId);
    }
  };

  return (
    <div
      className="voice-part-section"
      style={{
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderLeft: `4px solid ${getColorValue(color)}`,
        borderRadius: '4px',
        marginBottom: '1rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          gap: '1rem',
        }}
      >
        {/* Left side: Toggle and name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Collapse/Expand Toggle */}
          {/* [EARS: VOICE-002] Collapse/expand toggle */}
          <button
            onClick={handleToggleExpand}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Voice Part Name */}
          <h3
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#fff',
            }}
          >
            {name}
          </h3>

          {/* Track Count */}
          {/* [EARS: VOICE-003] Display track count */}
          <span
            style={{
              fontSize: '0.875rem',
              color: '#999',
            }}
          >
            {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
          </span>
        </div>

        {/* Right side: Add Track button */}
        {/* [EARS: REC-001] Add Track button */}
        <button
          onClick={handleAddTrack}
          aria-label="Add Track"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: getColorValue(color),
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          +
        </button>
      </div>

      {/* Tracks Content */}
      {isExpanded && children && (
        <div
          style={{
            padding: '0 1rem 1rem 1rem',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
