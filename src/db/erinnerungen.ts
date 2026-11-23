// Erinnerungen: frei angelegt oder automatisch zu Aufgaben/Terminen („Erinnern: 15 Min. vorher“).
// Ehrlich: Bei geschlossener App kann eine Web-App nicht zuverlässig wecken. Darum gibt es
// die „Verpasst“-Liste und den Export in den Handy-Kalender.
import { db } from './datenbank';
import { aendern, hinzufuegen, jetzt as jetztISO, mitBasis } from './basis';
import type { Aufgabe, Erinnerung, Termin, Wiederholung } from './typen';
import { naechstesVorkommen } from '../lib/wiederholung';
import { datumTeil, minutenDazu, tageDazu, uhrzeitTeil, verbinden, zeitpunktText } from '../lib/zeit';

/** Ohne Uhrzeit wird um 9 Uhr erinnert. */
export const STANDARD_UHRZEIT = '09:00';

export const VORLAUF_OPTIONEN: { wert: number; text: string }[] = [
  { wert: 0, text: 'Zur Uhrzeit' },
  { wert: 15, text: '15 Minuten vorher' },
  { wert: 60, text: '1 Stunde vorher' },
  { wert: 120, text: '2 Stunden vorher' },
  { wert: 1440, text: '1 Tag vorher' },
  { wert: 2880, text: '2 Tage vorher' },
  { wert: 10080, text: '1 Woche vorher' }
];

export function vorlaufLesbar(minuten: number): string {
  return VORLAUF_OPTIONEN.find((o) => o.wert === minuten)?.text ?? `${minuten} Minuten vorher`;
}

type BezugTyp = 'aufgabe' | 'termin';
const OFFEN: Erinnerung['status'][] = ['offen', 'gezeigt', 'verschoben'];

async function verknuepfte(typ: BezugTyp, id: string): Promise<Erinnerung[]> {
  return db.erinnerungen.filter((e) => e.bezug.typ === typ && e.bezug.id === id).toArray();
}

/** Grundzeit eines Vorkommens: Uhrzeit des Termins oder 9 Uhr. */
function grundzeit(beginn: string): string {
  return uhrzeitTeil(beginn) ? beginn.slice(0, 16) : verbinden(datumTeil(beginn), STANDARD_UHRZEIT);
}

/** Erstes Vorkommen eines Termins, das noch nicht begonnen hat (ab `jetzt`). */
function terminVorkommenAb(t: Termin, jetzt: Date, nachDatum?: string): string | null {
  const start = datumTeil(t.beginn);
  const zeit = uhrzeitTeil(t.beginn);
  const jetztText = zeitpunktText(jetzt);
  const mitZeit = (d: string) => (zeit ? verbinden(d, zeit) : d);
  const nochNicht = (d: string) => (zeit ? verbinden(d, zeit) >= jetztText : d >= datumTeil(jetztText));
  if (!t.wiederholung) {
    if (nachDatum && start <= nachDatum) return null;
    return nochNicht(start) ? mitZeit(start) : null;
  }
  let d: string | null = nachDatum ?? tageDazu(start, -1);
  for (let i = 0; i < 2000; i++) {
    d = naechstesVorkommen(start, t.wiederholung, d!);
    if (!d) return null;
    if (nachDatum || nochNicht(d)) return mitZeit(d);
  }
  return null;
}

interface Soll {
  text: string;
  zeitpunkt: string;
  vorkommen?: string;
}

function sollFuerAufgabe(a: Aufgabe | undefined): Soll | null {
  if (!a || a.geloeschtAm || a.erledigtAm || !a.faelligAm || a.erinnerungMinuten === undefined) return null;
  const basis = verbinden(a.faelligAm, a.uhrzeit ?? STANDARD_UHRZEIT);
  return { text: a.titel, zeitpunkt: minutenDazu(basis, -a.erinnerungMinuten) };
}

function sollFuerTermin(t: Termin | undefined, jetzt: Date, nachDatum?: string): Soll | null {
  if (!t || t.geloeschtAm || t.erinnerungMinuten === undefined) return null;
  const vorkommen = terminVorkommenAb(t, jetzt, nachDatum);
  if (!vorkommen) return null;
  return { text: t.titel, zeitpunkt: minutenDazu(grundzeit(vorkommen), -t.erinnerungMinuten), vorkommen };
}

/**
 * Bringt die automatische Erinnerung einer Aufgabe/eines Termins auf den neuesten Stand.
 * Unveränderte Erinnerungen behalten ihren Status (z. B. „erledigt“).
 */
export async function erinnerungAbgleichen(typ: BezugTyp, id: string, jetzt = new Date()): Promise<void> {
  await db.transaction('rw', db.erinnerungen, db.aufgaben, db.termine, async () => {
    const vorhanden = await verknuepfte(typ, id);
    const alt = vorhanden.find((e) => !e.geloeschtAm);
    let soll: Soll | null;
    if (typ === 'aufgabe') {
      soll = sollFuerAufgabe(await db.aufgaben.get(id));
    } else {
      const t = await db.termine.get(id);
      soll = sollFuerTermin(t, jetzt);
      // Gleiches Vorkommen schon erledigt? Dann das nächste nehmen.
      if (soll && alt && alt.status === 'erledigt' && alt.vorkommen === soll.vorkommen && alt.zeitpunkt === soll.zeitpunkt) {
        soll = sollFuerTermin(t, jetzt, datumTeil(alt.vorkommen!)) ?? soll;
      }
    }
    // Überzählige/gelöschte Einträge entfernen
    for (const e of vorhanden) if (e !== alt) await db.erinnerungen.delete(e.id);
    if (!soll) {
      if (alt) await db.erinnerungen.delete(alt.id);
      return;
    }
    if (alt) {
      if (alt.zeitpunkt === soll.zeitpunkt && alt.text === soll.text && alt.vorkommen === soll.vorkommen) return;
      const gleicherZeitpunkt = alt.zeitpunkt === soll.zeitpunkt && alt.vorkommen === soll.vorkommen;
      await db.erinnerungen.put({
        ...alt,
        ...soll,
        status: gleicherZeitpunkt ? alt.status : 'offen',
        imKalenderExportiert: gleicherZeitpunkt ? alt.imKalenderExportiert : false,
        geaendertAm: jetztISO()
      });
    } else {
      await db.erinnerungen.add(
        mitBasis<Omit<Erinnerung, keyof import('./typen').Basis>>({
          bezug: { typ, id },
          ...soll,
          status: 'offen',
          imKalenderExportiert: false
        })
      );
    }
  });
}

/** Automatische Erinnerungen entfernen (z. B. wenn die Aufgabe gelöscht wird). */
export async function erinnerungenZuEntfernen(typ: BezugTyp, id: string): Promise<void> {
  const liste = await verknuepfte(typ, id);
  await db.erinnerungen.bulkDelete(liste.map((e) => e.id));
}

export async function freieErinnerungSpeichern(
  daten: { text: string; zeitpunkt: string; wiederholung?: Wiederholung },
  id?: string
): Promise<string> {
  const text = daten.text.trim();
  const wiederholung = daten.wiederholung ? { ...daten.wiederholung, anker: datumTeil(daten.zeitpunkt) } : undefined;
  if (id) {
    await aendern('erinnerungen', id, { text, zeitpunkt: daten.zeitpunkt, wiederholung, status: 'offen', imKalenderExportiert: false });
    return id;
  }
  return hinzufuegen('erinnerungen', {
    bezug: { typ: 'frei' },
    text,
    zeitpunkt: daten.zeitpunkt,
    wiederholung,
    status: 'offen',
    imKalenderExportiert: false
  } satisfies Omit<Erinnerung, keyof import('./typen').Basis>);
}

/** „Erledigt“ – wiederkehrende Erinnerungen springen zum nächsten Mal. */
export async function erinnerungErledigen(id: string, jetzt = new Date()): Promise<string | null> {
  const e = await db.erinnerungen.get(id);
  if (!e) return null;
  if (e.bezug.typ === 'termin' && e.bezug.id && e.vorkommen) {
    const t = await db.termine.get(e.bezug.id);
    if (t?.wiederholung) {
      const soll = sollFuerTermin(t, jetzt, datumTeil(e.vorkommen));
      if (soll) {
        await aendern('erinnerungen', id, { ...soll, status: 'offen', imKalenderExportiert: false });
        return soll.zeitpunkt;
      }
    }
  }
  if (e.bezug.typ === 'frei' && e.wiederholung) {
    const uhr = uhrzeitTeil(e.zeitpunkt) ?? STANDARD_UHRZEIT;
    let tag: string | null = datumTeil(e.zeitpunkt);
    const heuteText = datumTeil(zeitpunktText(jetzt));
    // Nächstes Mal, das noch nicht vorbei ist
    do {
      tag = naechstesVorkommen(e.wiederholung.anker ?? datumTeil(e.zeitpunkt), e.wiederholung, tag!);
    } while (tag && verbinden(tag, uhr) <= zeitpunktText(jetzt) && tag <= heuteText);
    if (tag) {
      const neu = verbinden(tag, uhr);
      await aendern('erinnerungen', id, { zeitpunkt: neu, status: 'offen' });
      return neu;
    }
  }
  await aendern('erinnerungen', id, { status: 'erledigt' });
  return null;
}

/** „Später erinnern“ – um so viele Minuten ab jetzt verschieben. */
export async function erinnerungVerschieben(id: string, minuten: number, jetzt = new Date()): Promise<string> {
  const neu = minutenDazu(zeitpunktText(jetzt), minuten);
  await aendern('erinnerungen', id, { zeitpunkt: neu, status: 'verschoben' });
  return neu;
}

export function istFaellig(e: Erinnerung, jetzt = new Date()): boolean {
  return !e.geloeschtAm && OFFEN.includes(e.status) && e.zeitpunkt <= zeitpunktText(jetzt);
}

export function istKommend(e: Erinnerung, jetzt = new Date()): boolean {
  return !e.geloeschtAm && OFFEN.includes(e.status) && e.zeitpunkt > zeitpunktText(jetzt);
}

/** Fällige und verpasste Erinnerungen, älteste zuerst. */
export async function faelligeErinnerungen(jetzt = new Date()): Promise<Erinnerung[]> {
  const grenze = zeitpunktText(jetzt);
  const liste = await db.erinnerungen.where('zeitpunkt').belowOrEqual(grenze).toArray();
  return liste.filter((e) => istFaellig(e, jetzt)).sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt));
}

/**
 * Für den Wächter: Erinnerungen, die neu fällig geworden sind, werden als „gezeigt“ markiert.
 * Zurück kommen nur die frischen (höchstens 1 Stunde alt) – nur dafür gibt es eine Benachrichtigung.
 */
export async function neuFaelligMarkieren(jetzt = new Date()): Promise<Erinnerung[]> {
  const frischAb = zeitpunktText(new Date(jetzt.getTime() - 60 * 60_000));
  return db.transaction('rw', db.erinnerungen, async () => {
    const faellig = (await faelligeErinnerungen(jetzt)).filter((e) => e.status !== 'gezeigt');
    for (const e of faellig) await db.erinnerungen.update(e.id, { status: 'gezeigt' });
    return faellig.filter((e) => e.zeitpunkt >= frischAb);
  });
}
