import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppStateProvider } from './context/AppStateContext';
import { AuthProvider } from './features/auth/AuthProvider';
// Bundled instead of loaded from Google Fonts, so the installed app looks right with no internet.
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppStateProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppStateProvider>
    </ErrorBoundary>
  </StrictMode>,
);
