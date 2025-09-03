import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorProvider } from './contexts/ErrorContext.tsx';
import ErrorToast from './components/ErrorToast.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorProvider>
      <App />
      <ErrorToast />
    </ErrorProvider>
  </StrictMode>
);
