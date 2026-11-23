import { db } from './datenbank';
import { aendern, hinzufuegen, inPapierkorb, wiederherstellen } from './basis';
import type { Termin } from './typen';
import { vorkommenImBereich } from '../lib/wiederholung';
import { datumTeil, tageDazu, uhrzeitTeil } from '../lib/zeit';
import { differenceInCalendarDays } from 'date-fns';
import { lesen } from '../lib/zeit';
import { erinnerungAbgleichen, erinnerungenZuEntfernen } from './erinnerungen';

export type NeuerTermin = Omit<Termin, 'id' | 'erstelltAm' | 'geaendertAm' | 'geloeschtAm' | 'quelle'>;

export async function terminSpeichern(daten: NeuerTermin, id?: string): Promise<string> {
  const sauber: NeuerTermin = { ...daten, titel: daten.titel.trim() };
  if (sauber.wiederholung) sauber.wiederholung = { ...sauber.wiederholung, anker: datumTeil(sauber.beginn) };
  if (id) {
    const leer: Record<string, undefined> = {};
    for (const f of ['ort', 'ende', 'notiz', 'wiederholung', 'erinnerungMinuten', 'farbe'] as const) {
      if (sauber[f] === undefined) leer[f] = undefined;
    }
    await aendern('termine', id, { ...sauber, ...leer });
  } else {
    id = await hinzufuegen('termine', sauber);
  }
  await erinnerungAbgleichen('termin', id);
  return id;
}

export async function terminLoeschen(id: string): Promise<void> {
  await inPapierkorb('termine', id);
  await erinnerungenZuEntfernen('termin', id);
}

export async function terminWiederherstellen(id: string): Promise<void> {
  await wiederherstellen('termine', id);
  await erinnerungAbgleichen('termin', id);
}

/** Ein konkretes Vorkommen eines (evtl. wiederkehrenden) Termins an einem Tag. */
export interface TerminVorkommen {
  termin: Termin;
  /** Tag, an dem es angezeigt wird */
  tag: string;
  /** Beginn dieses Vorkommens ("JJJJ-MM-TT" oder mit Uhrzeit) */
  beginn: string;
  ende?: string;
  /** Mehrtägig: Tag x von y */
  mehrtaegig?: { tag: number; von: number };
}

/** Wie viele Tage ein ganztägiger Termin dauert (mind. 1). */
function dauerTage(t: Termin): number {
  if (!t.ganztaegig || !t.ende) return 1;
  return Math.max(1, differenceInCalendarDays(lesen(datumTeil(t.ende)), lesen(datumTeil(t.beginn))) + 1);
}

/** Alle Vorkommen von Terminen zwischen `von` und `bis` (inkl.), nach Tag und Uhrzeit sortiert. */
export function termineImBereich(termine: Termin[], von: string, bis: string): TerminVorkommen[] {
  const liste: TerminVorkommen[] = [];
  for (const t of termine) {
    if (t.geloeschtAm) continue;
    const start = datumTeil(t.beginn);
    const dauer = dauerTage(t);
    // Auch Vorkommen, die vor `von` beginnen, aber noch hineinreichen
    for (const tag0 of vorkommenImBereich(start, t.wiederholung, tageDazu(von, 1 - dauer), bis)) {
      const zeit = uhrzeitTeil(t.beginn);
      const endZeit = t.ende ? uhrzeitTeil(t.ende) : undefined;
      for (let i = 0; i < dauer; i++) {
        const tag = tageDazu(tag0, i);
        if (tag < von || tag > bis) continue;
        liste.push({
          termin: t,
          tag,
          beginn: zeit ? `${tag0}T${zeit}` : tag0,
          ende: endZeit ? `${tag0}T${endZeit}` : t.ganztaegig && t.ende ? tageDazu(tag0, dauer - 1) : undefined,
          mehrtaegig: dauer > 1 ? { tag: i + 1, von: dauer } : undefined
        });
      }
    }
  }
  return liste.sort(
    (a, b) =>
      a.tag.localeCompare(b.tag) ||
      Number(!a.termin.ganztaegig) - Number(!b.termin.ganztaegig) ||
      a.beginn.localeCompare(b.beginn) ||
      a.termin.titel.localeCompare(b.termin.titel)
  );
}

export async function aktiveTermine(): Promise<Termin[]> {
  return (await db.termine.toArray()).filter((t) => !t.geloeschtAm);
}

/** Termin-Zeitraum lesbar: „14:00–15:30 Uhr“, „ab 9:00 Uhr“, „ganztägig“ */
export function zeitraumLesbar(v: TerminVorkommen): string {
  if (v.termin.ganztaegig) return v.mehrtaegig ? `ganztägig · Tag ${v.mehrtaegig.tag} von ${v.mehrtaegig.von}` : 'ganztägig';
  const b = uhrzeitTeil(v.beginn);
  const e = v.ende ? uhrzeitTeil(v.ende) : undefined;
  return e ? `${b}–${e} Uhr` : `${b} Uhr`;
}
