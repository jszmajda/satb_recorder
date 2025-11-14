import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  test('renders the application title', () => {
    render(<App />);
    expect(screen.getByText('SATB Harmony Recorder')).toBeInTheDocument();
  });

  test('displays development message', () => {
    render(<App />);
    expect(screen.getByText(/Development in progress/i)).toBeInTheDocument();
  });
});
