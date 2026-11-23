// Wiederholungen berechnen (täglich, wöchentlich, monatlich, jährlich).
import { addMonths, addYears, differenceInCalendarDays } from 'date-fns';
import type { Wiederholung } from '../db/typen';
import { datumText, lesen, tageDazu, wochentag } from './zeit';

const SICHERHEIT = 5000;

/**
 * Liefert der Reihe nach alle Vorkommen (Datum "JJJJ-MM-TT") ab `start`,
 * beginnend frühestens bei `ab` (Abkürzung für lange Reihen).
 */
function* reihe(start: string, w: Wiederholung, ab: string = start): Generator<string> {
  const intervall = Math.max(1, Math.floor(w.intervall || 1));
  const anker = w.anker && w.anker <= start ? w.anker : start;
  const bis = w.bis;
  let n = 0;
  const ende = (d: string) => (bis !== undefined && d > bis) || ++n > SICHERHEIT;

  if (w.art === 'taeglich') {
    const sprung = Math.max(0, Math.floor(differenceInCalendarDays(lesen(ab), lesen(anker)) / intervall));
    for (let k = sprung; ; k++) {
      const d = tageDazu(anker, k * intervall);
      if (ende(d)) return;
      if (d >= start) yield d;
    }
  }

  if (w.art === 'woechentlich') {
    const tage = w.wochentage && w.wochentage.length ? [...new Set(w.wochentage)].sort() : [wochentag(anker)];
    const ankerMontag = tageDazu(anker, 1 - wochentag(anker));
    const wochenAbstand = Math.floor(differenceInCalendarDays(lesen(ab), lesen(ankerMontag)) / 7);
    const sprung = Math.max(0, Math.floor(wochenAbstand / intervall));
    for (let k = sprung; ; k++) {
      const montag = tageDazu(ankerMontag, k * intervall * 7);
      for (const t of tage) {
        const d = tageDazu(montag, t - 1);
        if (ende(d)) return;
        if (d >= start && d >= anker) yield d;
      }
    }
  }

  // monatlich / jährlich: immer vom Anker aus rechnen, damit z. B. der 31. nicht „wandert“.
  for (let k = 0; ; k++) {
    const d = datumText(
      w.art === 'monatlich' ? addMonths(lesen(anker), k * intervall) : addYears(lesen(anker), k * intervall)
    );
    if (ende(d)) return;
    if (d >= start) yield d;
  }
}

/** Erstes Vorkommen, das strikt nach `nach` liegt (oder null, wenn die Reihe vorher endet). */
export function naechstesVorkommen(start: string, w: Wiederholung, nach: string): string | null {
  for (const d of reihe(start, w, nach)) {
    if (d > nach) return d;
  }
  return null;
}

/** Alle Vorkommen zwischen `von` und `bis` (beide einschließlich). */
export function vorkommenImBereich(start: string, w: Wiederholung | undefined, von: string, bis: string): string[] {
  if (!w) return start >= von && start <= bis ? [start] : [];
  const liste: string[] = [];
  for (const d of reihe(start, w, von)) {
    if (d > bis) break;
    if (d >= von) liste.push(d);
  }
  return liste;
}

const EINHEIT: Record<Wiederholung['art'], [string, string]> = {
  taeglich: ['Tag', 'Tage'],
  woechentlich: ['Woche', 'Wochen'],
  monatlich: ['Monat', 'Monate'],
  jaehrlich: ['Jahr', 'Jahre']
};
const EINFACH: Record<Wiederholung['art'], string> = {
  taeglich: 'Jeden Tag',
  woechentlich: 'Jede Woche',
  monatlich: 'Jeden Monat',
  jaehrlich: 'Jedes Jahr'
};
const TAGNAMEN = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** z. B. „Jede Woche (Mo, Do)“ oder „Alle 2 Monate“ */
export function wiederholungLesbar(w: Wiederholung): string {
  const i = Math.max(1, w.intervall || 1);
  let text = i === 1 ? EINFACH[w.art] : `Alle ${i} ${EINHEIT[w.art][1]}`;
  if (w.art === 'woechentlich' && w.wochentage?.length) {
    text += ` (${[...w.wochentage].sort().map((t) => TAGNAMEN[t - 1]).join(', ')})`;
  }
  return text;
}
