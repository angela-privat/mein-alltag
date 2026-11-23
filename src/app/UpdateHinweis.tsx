import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

/**
 * Registriert den Service Worker (Offline-Fähigkeit) und zeigt einen Hinweis,
 * sobald eine neue Version der App bereitliegt.
 */
export function UpdateHinweis() {
  const {
    needRefresh: [neueVersion, setNeueVersion],
    offlineReady: [offlineBereit, setOfflineBereit],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_url, registrierung) {
      // Einmal pro Stunde nach Updates schauen, solange die App offen ist.
      if (registrierung) setInterval(() => registrierung.update().catch(() => {}), 60 * 60 * 1000);
    }
  });

  if (neueVersion) {
    return (
      <div className="meldung" role="status">
        <RefreshCw size={20} aria-hidden />
        <span>Eine neue Version ist da.</span>
        <button onClick={() => updateServiceWorker(true)}>Neu laden</button>
        <button onClick={() => setNeueVersion(false)} aria-label="Später">
          Später
        </button>
      </div>
    );
  }
  if (offlineBereit) {
    return (
      <div className="meldung" role="status">
        <span>Fertig: Die App funktioniert jetzt auch ohne Internet.</span>
        <button onClick={() => setOfflineBereit(false)}>OK</button>
      </div>
    );
  }
  return null;
}
