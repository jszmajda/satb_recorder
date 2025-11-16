import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MetronomeProvider } from './contexts/MetronomeContext';
import { MixerProvider } from './contexts/MixerContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MetronomeProvider>
      <MixerProvider>
        <App />
      </MixerProvider>
    </MetronomeProvider>
  </React.StrictMode>
);
