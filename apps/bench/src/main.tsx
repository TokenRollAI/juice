import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@tokenroll/juice/styles.css';
import './bench.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
