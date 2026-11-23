import { db, SCHEMA_VERSION } from './datenbank';
import type { Einstellungen } from './typen';

export const MODULE = [
  { schluessel: 'aufgaben', name: 'Aufgaben & Kalender' },
  { schluessel: 'einkauf', name: 'Einkauf' },
  { schluessel: 'haushalt', name: 'Haushalt' },
  { schluessel: 'essen', name: 'Essensplaner' },
  { schluessel: 'finanzen', name: 'Finanzen' },
  { schluessel: 'notizen', name: 'Notizen & Dokumente' },
  { schluessel: 'erinnerungen', name: 'Erinnerungen' }
] as const;

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  id: 'einstellungen',
  design: 'system',
  schriftgroesse: 'normal',
  wochenstart: 1,
  sicherungErinnerungTage: 7,
  module: Object.fromEntries(MODULE.map((m) => [m.schluessel, true])),
  schemaVersion: SCHEMA_VERSION
};

export async function einstellungenLaden(): Promise<Einstellungen> {
  const gespeichert = await db.einstellungen.get('einstellungen');
  return {
    ...STANDARD_EINSTELLUNGEN,
    ...gespeichert,
    module: { ...STANDARD_EINSTELLUNGEN.module, ...gespeichert?.module }
  };
}

/**
 * Speichert Änderungen. Läuft in einer Transaktion, damit schnell
 * aufeinanderfolgende Änderungen sich nicht gegenseitig überschreiben.
 */
export async function einstellungenSpeichern(aenderung: Partial<Omit<Einstellungen, 'id'>>): Promise<void> {
  await db.transaction('rw', db.einstellungen, async () => {
    const aktuell = await einstellungenLaden();
    await db.einstellungen.put({ ...aktuell, ...aenderung, id: 'einstellungen' });
  });
}

/** Ist eine Sicherung fällig? */
export function sicherungFaellig(e: Einstellungen, heute = new Date()): boolean {
  if (e.sicherungErinnerungTage <= 0) return false;
  if (!e.letzteSicherungAm) return true;
  const tage = (heute.getTime() - new Date(e.letzteSicherungAm).getTime()) / 86_400_000;
  return tage >= e.sicherungErinnerungTage;
}
