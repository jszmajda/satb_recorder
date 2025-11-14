// [EARS: ERR-001, ERR-002, ERR-003] Error notification component for displaying user-friendly error messages

export interface ErrorNotificationProps {
  /** Error message to display, or null if no error */
  error: string | null;
  /** Callback when error is dismissed */
  onDismiss: () => void;
}

/**
 * ErrorNotification - Displays error messages to the user
 * [EARS: ERR-001, ERR-002, ERR-003] User-friendly error display
 */
export function ErrorNotification({ error, onDismiss }: ErrorNotificationProps) {
  // Don't render if no error
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: '#f44336',
        color: '#fff',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        maxWidth: '500px',
        cursor: 'pointer',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      {/* Error Icon */}
      <span style={{ fontSize: '1.5rem' }} aria-hidden="true">
        ⚠️
      </span>

      {/* Error Message */}
      <span style={{ flex: 1, fontSize: '1rem', fontWeight: '500' }}>
        {error}
      </span>

      {/* Dismiss Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss error"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '1.5rem',
          cursor: 'pointer',
          padding: '0',
          lineHeight: '1',
          opacity: 0.8,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
      >
        ✕
      </button>

      {/* Add animation keyframes via inline style tag */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-1rem);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
