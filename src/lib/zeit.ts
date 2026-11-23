// Hilfen für Datum und Uhrzeit. Alles in Ortszeit, als Text gespeichert:
//   Datum:            "JJJJ-MM-TT"
//   Datum + Uhrzeit:  "JJJJ-MM-TTTHH:MM"
import { addDays, addMinutes, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export function datumText(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function zeitpunktText(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

/** Liest "JJJJ-MM-TT" oder "JJJJ-MM-TTTHH:MM" als Ortszeit. */
export function lesen(text: string): Date {
  return parseISO(text);
}

export function heute(jetzt = new Date()): string {
  return datumText(jetzt);
}

export function tageDazu(datum: string, tage: number): string {
  return datumText(addDays(lesen(datum), tage));
}

export function minutenDazu(zeitpunkt: string, minuten: number): string {
  return zeitpunktText(addMinutes(lesen(zeitpunkt), minuten));
}

export function datumTeil(text: string): string {
  return text.slice(0, 10);
}

export function uhrzeitTeil(text: string): string | undefined {
  return text.length > 10 ? text.slice(11, 16) : undefined;
}

export function verbinden(datum: string, uhrzeit: string): string {
  return `${datum}T${uhrzeit}`;
}

/** „heute“, „morgen“, „gestern“ oder z. B. „Fr., 28. Nov.“ */
export function tagLesbar(datum: string, jetzt = new Date()): string {
  const h = heute(jetzt);
  if (datum === h) return 'heute';
  if (datum === tageDazu(h, 1)) return 'morgen';
  if (datum === tageDazu(h, -1)) return 'gestern';
  const d = lesen(datum);
  const gleichesJahr = d.getFullYear() === jetzt.getFullYear();
  return format(d, gleichesJahr ? 'EEE, d. MMM' : 'EEE, d. MMM yyyy', { locale: de });
}

/** z. B. „heute, 14:30“ */
export function zeitpunktLesbar(zeitpunkt: string, jetzt = new Date()): string {
  const u = uhrzeitTeil(zeitpunkt);
  return tagLesbar(datumTeil(zeitpunkt), jetzt) + (u ? `, ${u} Uhr` : '');
}

/** Wochentag 1 = Montag … 7 = Sonntag */
export function wochentag(datum: string): number {
  const t = lesen(datum).getDay();
  return t === 0 ? 7 : t;
}

export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
