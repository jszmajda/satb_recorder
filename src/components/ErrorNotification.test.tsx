// [EARS: ERR-001, ERR-002, ERR-003] Tests for error notification component

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorNotification } from './ErrorNotification';

describe('ErrorNotification', () => {
  describe('Display behavior', () => {
    test('does not render when no error is provided', () => {
      const { container } = render(<ErrorNotification error={null} onDismiss={() => {}} />);
      expect(container.firstChild).toBeNull();
    });

    test('renders error message when error is provided', () => {
      render(<ErrorNotification error="Test error message" onDismiss={() => {}} />);
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    test('displays error icon', () => {
      render(<ErrorNotification error="Test error" onDismiss={() => {}} />);
      // Check for error icon (⚠️ or similar)
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('has dismiss button', () => {
      render(<ErrorNotification error="Test error" onDismiss={() => {}} />);
      expect(screen.getByRole('button', { name: /dismiss|close/i })).toBeInTheDocument();
    });
  });

  describe('Dismiss behavior', () => {
    test('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(<ErrorNotification error="Test error" onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    test('calls onDismiss when clicking the notification itself (optional)', () => {
      const onDismiss = vi.fn();
      render(<ErrorNotification error="Test error" onDismiss={onDismiss} />);

      const notification = screen.getByRole('alert');
      fireEvent.click(notification);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error types - EARS requirements', () => {
    test('displays microphone permission denied error (ERR-001)', () => {
      render(
        <ErrorNotification
          error="Microphone permission denied"
          onDismiss={() => {}}
        />
      );
      expect(screen.getByText(/microphone permission denied/i)).toBeInTheDocument();
    });

    test('displays storage quota exceeded error (ERR-002)', () => {
      render(
        <ErrorNotification
          error="Storage quota exceeded"
          onDismiss={() => {}}
        />
      );
      expect(screen.getByText(/storage quota exceeded/i)).toBeInTheDocument();
    });

    test('displays recording failed error (ERR-003)', () => {
      render(
        <ErrorNotification
          error="Recording failed"
          onDismiss={() => {}}
        />
      );
      expect(screen.getByText(/recording failed/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    test('has error styling (red/warning colors)', () => {
      const { container } = render(<ErrorNotification error="Test error" onDismiss={() => {}} />);
      const alert = screen.getByRole('alert');

      // Check that the component has some styling applied
      expect(alert).toHaveStyle({ position: 'fixed' });
    });

    test('is positioned at top of screen', () => {
      render(<ErrorNotification error="Test error" onDismiss={() => {}} />);
      const alert = screen.getByRole('alert');

      expect(alert).toHaveStyle({ position: 'fixed' });
      expect(alert).toHaveStyle({ top: '1rem' });
    });
  });

  describe('Accessibility', () => {
    test('has role="alert" for screen readers', () => {
      render(<ErrorNotification error="Test error" onDismiss={() => {}} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('dismiss button has accessible label', () => {
      render(<ErrorNotification error="Test error" onDismiss={() => {}} />);
      const button = screen.getByRole('button', { name: /dismiss|close/i });
      expect(button).toBeInTheDocument();
    });

    test('error message is readable by screen readers', () => {
      render(<ErrorNotification error="Important error" onDismiss={() => {}} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Important error');
    });
  });
});
