import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VoicePartSection } from './VoicePartSection';

describe('VOICE-001: Voice part sections', () => {
  // ✅ Happy path
  test('renders voice part name', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    expect(screen.getByText(/soprano/i)).toBeInTheDocument();
  });

  test('renders Soprano section', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    expect(screen.getByText(/soprano/i)).toBeInTheDocument();
  });

  test('renders Alto section', () => {
    render(<VoicePartSection voicePartId="alto" name="Alto" color="blue" trackCount={0} />);

    expect(screen.getByText(/alto/i)).toBeInTheDocument();
  });

  test('renders Tenor section', () => {
    render(<VoicePartSection voicePartId="tenor" name="Tenor" color="green" trackCount={0} />);

    expect(screen.getByText(/tenor/i)).toBeInTheDocument();
  });

  test('renders Bass section', () => {
    render(<VoicePartSection voicePartId="bass" name="Bass" color="purple" trackCount={0} />);

    expect(screen.getByText(/bass/i)).toBeInTheDocument();
  });
});

describe('VOICE-002: Collapse/expand toggle', () => {
  // ✅ Happy path
  test('renders collapse/expand toggle button', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    const toggleButton = screen.getByRole('button', { name: /collapse|expand/i });
    expect(toggleButton).toBeInTheDocument();
  });

  test('section is expanded by default', () => {
    render(
      <VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0}>
        <div data-testid="track-content">Track content</div>
      </VoicePartSection>
    );

    expect(screen.getByTestId('track-content')).toBeInTheDocument();
  });

  test('clicking toggle button collapses section', () => {
    render(
      <VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0}>
        <div data-testid="track-content">Track content</div>
      </VoicePartSection>
    );

    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(toggleButton);

    expect(screen.queryByTestId('track-content')).not.toBeInTheDocument();
  });

  test('clicking toggle button twice expands section again', () => {
    render(
      <VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0}>
        <div data-testid="track-content">Track content</div>
      </VoicePartSection>
    );

    const toggleButton = screen.getByRole('button', { name: /collapse/i });

    // Collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByTestId('track-content')).not.toBeInTheDocument();

    // Expand
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    expect(screen.getByTestId('track-content')).toBeInTheDocument();
  });

  test('toggle button shows collapse icon when expanded', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    expect(toggleButton).toHaveTextContent('▼');
  });

  test('toggle button shows expand icon when collapsed', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(toggleButton);

    const expandButton = screen.getByRole('button', { name: /expand/i });
    expect(expandButton).toHaveTextContent('▶');
  });
});

describe('VOICE-003: Track count display', () => {
  // ✅ Happy path
  test('displays track count of 0', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    expect(screen.getByText(/0 tracks?/i)).toBeInTheDocument();
  });

  test('displays track count of 1', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={1} />);

    expect(screen.getByText(/1 track/i)).toBeInTheDocument();
  });

  test('displays track count of multiple tracks', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={5} />);

    expect(screen.getByText(/5 tracks/i)).toBeInTheDocument();
  });

  test('uses singular "track" for count of 1', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={1} />);

    expect(screen.getByText(/1 track$/i)).toBeInTheDocument();
  });

  test('uses plural "tracks" for count of 0', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    expect(screen.getByText(/0 tracks$/i)).toBeInTheDocument();
  });

  test('uses plural "tracks" for count > 1', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={3} />);

    expect(screen.getByText(/3 tracks$/i)).toBeInTheDocument();
  });
});

describe('VOICE-004: Color coding', () => {
  // ✅ Happy path
  test('applies red color for Soprano', () => {
    const { container } = render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0} />);

    const section = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(section);

    // Check that the color is applied (exact color may vary based on implementation)
    expect(section).toHaveStyle({ borderLeft: expect.stringContaining('red') });
  });

  test('applies blue color for Alto', () => {
    const { container } = render(<VoicePartSection voicePartId="alto" name="Alto" color="blue" trackCount={0} />);

    const section = container.firstChild as HTMLElement;
    expect(section).toHaveStyle({ borderLeft: expect.stringContaining('blue') });
  });

  test('applies green color for Tenor', () => {
    const { container } = render(<VoicePartSection voicePartId="tenor" name="Tenor" color="green" trackCount={0} />);

    const section = container.firstChild as HTMLElement;
    expect(section).toHaveStyle({ borderLeft: expect.stringContaining('green') });
  });

  test('applies purple color for Bass', () => {
    const { container } = render(<VoicePartSection voicePartId="bass" name="Bass" color="purple" trackCount={0} />);

    const section = container.firstChild as HTMLElement;
    expect(section).toHaveStyle({ borderLeft: expect.stringContaining('purple') });
  });
});


describe('VoicePartSection: Layout', () => {
  test('renders header with name, track count, and controls', () => {
    render(<VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={3} />);

    expect(screen.getByText(/soprano/i)).toBeInTheDocument();
    expect(screen.getByText(/3 tracks/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });

  test('renders children when expanded', () => {
    render(
      <VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0}>
        <div data-testid="child-content">Child content</div>
      </VoicePartSection>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  test('does not render children when collapsed', () => {
    render(
      <VoicePartSection voicePartId="soprano" name="Soprano" color="red" trackCount={0}>
        <div data-testid="child-content">Child content</div>
      </VoicePartSection>
    );

    const toggleButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(toggleButton);

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });
});
