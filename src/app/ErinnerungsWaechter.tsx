import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { faelligeErinnerungen, neuFaelligMarkieren } from '../db/erinnerungen';
import { db } from '../db/datenbank';
import { useMeldung } from '../ui/bausteine';
import { benachrichtigen, zahlAmSymbol } from './benachrichtigung';

const PRUEF_ABSTAND_MS = 20_000;

/**
 * Prüft regelmäßig (solange die App offen ist), ob eine Erinnerung fällig ist,
 * zeigt dann eine Meldung in der App und – wenn erlaubt – eine Handy-Benachrichtigung.
 */
export function ErinnerungsWaechter() {
  const melden = useMeldung();
  const navigate = useNavigate();

  // Zahl der fälligen Erinnerungen am App-Symbol
  const anzahl = useLiveQuery(async () => {
    await db.erinnerungen.count(); // Abhängigkeit für Live-Aktualisierung
    return (await faelligeErinnerungen()).length;
  });
  useEffect(() => {
    if (anzahl !== undefined) zahlAmSymbol(anzahl);
  }, [anzahl]);

  useEffect(() => {
    let aktiv = true;
    async function pruefen() {
      try {
        const neu = await neuFaelligMarkieren();
        if (!aktiv || !neu.length) return;
        for (const e of neu) {
          await benachrichtigen('Erinnerung', e.text, e.id);
        }
        navigator.vibrate?.([120, 80, 120]);
        melden({
          text: neu.length === 1 ? `🔔 ${neu[0].text}` : `🔔 ${neu.length} Erinnerungen sind fällig.`,
          aktion: { text: 'Ansehen', ausfuehren: () => navigate('/erinnerungen') }
        });
      } catch (f) {
        console.warn('Erinnerungen prüfen fehlgeschlagen', f);
      }
    }
    pruefen();
    const zeitgeber = window.setInterval(pruefen, PRUEF_ABSTAND_MS);
    const sichtbar = () => {
      if (document.visibilityState === 'visible') pruefen();
    };
    document.addEventListener('visibilitychange', sichtbar);
    return () => {
      aktiv = false;
      window.clearInterval(zeitgeber);
      document.removeEventListener('visibilitychange', sichtbar);
    };
  }, [melden, navigate]);

  return null;
}
