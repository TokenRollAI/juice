import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@juice-ui/react/styles.css';
import './bench.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
