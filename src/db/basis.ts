import type { Table } from 'dexie';
import { db, INHALTS_TABELLEN, type InhaltsTabelle } from './datenbank';
import type { Basis } from './typen';

export const PAPIERKORB_TAGE = 30;

export function jetzt(): string {
  return new Date().toISOString();
}

export function neueId(): string {
  return crypto.randomUUID();
}

/** Ergänzt die Grundfelder (id, Zeitstempel, Quelle) für einen neuen Eintrag. */
export function mitBasis<T extends object>(daten: T, quelle: Basis['quelle'] = 'manuell'): T & Basis {
  const zeit = jetzt();
  return { ...daten, id: neueId(), erstelltAm: zeit, geaendertAm: zeit, quelle };
}

function tabelle(name: InhaltsTabelle): Table<Basis, string> {
  return db.table(name) as Table<Basis, string>;
}

export async function hinzufuegen<T extends object>(name: InhaltsTabelle, daten: T): Promise<string> {
  const eintrag = mitBasis(daten);
  await tabelle(name).add(eintrag);
  return eintrag.id;
}

export async function aendern(name: InhaltsTabelle, id: string, aenderung: Record<string, unknown>): Promise<void> {
  await tabelle(name).update(id, { ...aenderung, geaendertAm: jetzt() });
}

/** In den Papierkorb legen (nicht sofort löschen). */
export async function inPapierkorb(name: InhaltsTabelle, id: string): Promise<void> {
  const zeit = jetzt();
  await tabelle(name).update(id, { geloeschtAm: zeit, geaendertAm: zeit });
}

export async function wiederherstellen(name: InhaltsTabelle, id: string): Promise<void> {
  await tabelle(name)
    .where('id')
    .equals(id)
    .modify((e) => {
      delete e.geloeschtAm;
      e.geaendertAm = jetzt();
    });
}

export async function endgueltigLoeschen(name: InhaltsTabelle, id: string): Promise<void> {
  await tabelle(name).delete(id);
}

export interface PapierkorbEintrag {
  tabelle: InhaltsTabelle;
  id: string;
  titel: string;
  geloeschtAm: string;
}

function anzeigeTitel(e: Record<string, unknown>): string {
  for (const feld of ['titel', 'name', 'text', 'beschreibung', 'freitext', 'geschaeft']) {
    const wert = e[feld];
    if (typeof wert === 'string' && wert.trim()) return wert;
  }
  return 'Ohne Titel';
}

export async function papierkorbLaden(): Promise<PapierkorbEintrag[]> {
  const liste: PapierkorbEintrag[] = [];
  for (const name of INHALTS_TABELLEN) {
    const geloescht = await tabelle(name).where('geloeschtAm').above('').toArray();
    for (const e of geloescht) {
      liste.push({
        tabelle: name,
        id: e.id,
        titel: anzeigeTitel(e as unknown as Record<string, unknown>),
        geloeschtAm: e.geloeschtAm!
      });
    }
  }
  return liste.sort((a, b) => b.geloeschtAm.localeCompare(a.geloeschtAm));
}

/** Löscht Einträge, die länger als 30 Tage im Papierkorb liegen. Gibt die Anzahl zurück. */
export async function papierkorbAufraeumen(stichtag = new Date()): Promise<number> {
  const grenze = new Date(stichtag.getTime() - PAPIERKORB_TAGE * 86_400_000).toISOString();
  let anzahl = 0;
  for (const name of INHALTS_TABELLEN) {
    anzahl += await tabelle(name).where('geloeschtAm').between('', grenze, false, true).delete();
  }
  return anzahl;
}

export async function papierkorbLeeren(): Promise<number> {
  let anzahl = 0;
  for (const name of INHALTS_TABELLEN) {
    anzahl += await tabelle(name).where('geloeschtAm').above('').delete();
  }
  return anzahl;
}
