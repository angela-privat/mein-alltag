import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { installationVorbereiten } from './app/installation';
import { papierkorbAufraeumen } from './db/basis';
import './ui/stil.css';

installationVorbereiten();

// Beim Start: alte Einträge (älter als 30 Tage) aus dem Papierkorb entfernen.
papierkorbAufraeumen().catch((f) => console.warn('Papierkorb aufräumen fehlgeschlagen', f));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
