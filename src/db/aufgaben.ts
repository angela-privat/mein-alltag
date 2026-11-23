import { db } from './datenbank';
import { aendern, hinzufuegen, inPapierkorb, jetzt, wiederherstellen } from './basis';
import type { Aufgabe } from './typen';
import { naechstesVorkommen } from '../lib/wiederholung';
import { heute, tageDazu } from '../lib/zeit';
import { erinnerungAbgleichen, erinnerungenZuEntfernen } from './erinnerungen';

export type NeueAufgabe = Omit<Aufgabe, 'id' | 'erstelltAm' | 'geaendertAm' | 'geloeschtAm' | 'quelle'>;

export async function aufgabeSpeichern(daten: NeueAufgabe, id?: string): Promise<string> {
  const sauber: NeueAufgabe = { ...daten, titel: daten.titel.trim() };
  if (sauber.wiederholung && sauber.faelligAm) sauber.wiederholung = { ...sauber.wiederholung, anker: sauber.wiederholung.anker ?? sauber.faelligAm };
  if (id) {
    // Felder, die geleert wurden, wirklich entfernen
    const leer: Record<string, undefined> = {};
    for (const f of ['notiz', 'faelligAm', 'uhrzeit', 'wiederholung', 'erinnerungMinuten'] as const) {
      if (sauber[f] === undefined) leer[f] = undefined;
    }
    await aendern('aufgaben', id, { ...sauber, ...leer });
  } else {
    id = await hinzufuegen('aufgaben', sauber);
  }
  await erinnerungAbgleichen('aufgabe', id);
  return id;
}

export interface ErledigtErgebnis {
  /** Bei Wiederholung: neues Fälligkeitsdatum */
  naechsteFaelligkeit?: string;
  /** Zustand vorher, für „Rückgängig“ */
  vorher: Aufgabe;
}

/** Aufgabe abhaken. Wiederkehrende Aufgaben rücken zum nächsten Termin vor. */
export async function aufgabeErledigen(id: string, jetztDatum = new Date()): Promise<ErledigtErgebnis> {
  const a = await db.aufgaben.get(id);
  if (!a) throw new Error('Aufgabe nicht gefunden');
  const h = heute(jetztDatum);
  if (a.wiederholung && a.faelligAm) {
    const nach = a.faelligAm > h ? a.faelligAm : h;
    const naechste = naechstesVorkommen(a.wiederholung.anker ?? a.faelligAm, a.wiederholung, nach);
    if (naechste) {
      await aendern('aufgaben', id, {
        faelligAm: naechste,
        unteraufgaben: a.unteraufgaben.map((u) => ({ ...u, erledigt: false }))
      });
      await erinnerungAbgleichen('aufgabe', id);
      return { naechsteFaelligkeit: naechste, vorher: a };
    }
  }
  await aendern('aufgaben', id, { erledigtAm: jetzt() });
  await erinnerungAbgleichen('aufgabe', id);
  return { vorher: a };
}

/** Rückgängig machen: alten Zustand wiederherstellen. */
export async function aufgabeZuruecksetzen(vorher: Aufgabe): Promise<void> {
  await db.aufgaben.put({ ...vorher, geaendertAm: jetzt() });
  await erinnerungAbgleichen('aufgabe', vorher.id);
}

export async function aufgabeWiederOeffnen(id: string): Promise<void> {
  await aendern('aufgaben', id, { erledigtAm: undefined });
  await erinnerungAbgleichen('aufgabe', id);
}

export async function aufgabeLoeschen(id: string): Promise<void> {
  await inPapierkorb('aufgaben', id);
  await erinnerungenZuEntfernen('aufgabe', id);
}

export async function aufgabeWiederherstellen(id: string): Promise<void> {
  await wiederherstellen('aufgaben', id);
  await erinnerungAbgleichen('aufgabe', id);
}

export interface AufgabenGruppen {
  ueberfaellig: Aufgabe[];
  heute: Aufgabe[];
  morgen: Aufgabe[];
  spaeter: Aufgabe[];
  ohneDatum: Aufgabe[];
  erledigt: Aufgabe[];
}

const PRIO = { hoch: 0, normal: 1, niedrig: 2 } as const;

function sortieren(a: Aufgabe, b: Aufgabe): number {
  return (
    (a.faelligAm ?? '9999').localeCompare(b.faelligAm ?? '9999') ||
    (a.uhrzeit ?? '99:99').localeCompare(b.uhrzeit ?? '99:99') ||
    PRIO[a.prioritaet] - PRIO[b.prioritaet] ||
    a.erstelltAm.localeCompare(b.erstelltAm)
  );
}

/** Ordnet Aufgaben nach Fälligkeit (gelöschte werden ignoriert). */
export function aufgabenGruppieren(alle: Aufgabe[], jetztDatum = new Date()): AufgabenGruppen {
  const h = heute(jetztDatum);
  const m = tageDazu(h, 1);
  const g: AufgabenGruppen = { ueberfaellig: [], heute: [], morgen: [], spaeter: [], ohneDatum: [], erledigt: [] };
  for (const a of alle) {
    if (a.geloeschtAm) continue;
    if (a.erledigtAm) g.erledigt.push(a);
    else if (!a.faelligAm) g.ohneDatum.push(a);
    else if (a.faelligAm < h) g.ueberfaellig.push(a);
    else if (a.faelligAm === h) g.heute.push(a);
    else if (a.faelligAm === m) g.morgen.push(a);
    else g.spaeter.push(a);
  }
  for (const k of ['ueberfaellig', 'heute', 'morgen', 'spaeter', 'ohneDatum'] as const) g[k].sort(sortieren);
  g.ohneDatum.sort((a, b) => PRIO[a.prioritaet] - PRIO[b.prioritaet] || b.erstelltAm.localeCompare(a.erstelltAm));
  g.erledigt.sort((a, b) => (b.erledigtAm ?? '').localeCompare(a.erledigtAm ?? ''));
  return g;
}

export async function aktiveAufgaben(): Promise<Aufgabe[]> {
  return (await db.aufgaben.toArray()).filter((a) => !a.geloeschtAm);
}
