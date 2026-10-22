import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { USE_MOCKS } from './services/ws';
import './index.css';

async function start() {
  // Mocks run unless VITE_USE_MOCKS=false, so the whole UI works without a backend.
  if (USE_MOCKS) await (await import('./mocks')).startMocks();
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
}
start();
