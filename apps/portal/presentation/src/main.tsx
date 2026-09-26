import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { GarageProvider } from '@cvs-garage/ui/presentation';
import '@cvs-garage/ui/presentation/styles.css';
import './presentation.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GarageProvider>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        <App />
      </MotionConfig>
    </GarageProvider>
  </StrictMode>,
);
