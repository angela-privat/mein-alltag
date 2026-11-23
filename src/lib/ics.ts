// Kalenderdatei (.ics, iCalendar RFC 5545) erzeugen, damit der Handy-Kalender
// den Termin samt Erinnerung übernimmt – die kommt dann auch bei geschlossener App.
import type { Wiederholung } from '../db/typen';
import { datumTeil, lesen, minutenDazu, tageDazu, uhrzeitTeil } from './zeit';

export interface KalenderEintrag {
  uid: string;
  titel: string;
  /** "JJJJ-MM-TT" (ganztägig) oder "JJJJ-MM-TTTHH:MM" */
  beginn: string;
  /** Ende-Zeitpunkt bzw. letzter Tag (ganztägig) */
  ende?: string;
  ganztaegig: boolean;
  ort?: string;
  notiz?: string;
  wiederholung?: Wiederholung;
  /** Erinnerung so viele Minuten vorher (fehlt = keine) */
  erinnerungMinuten?: number;
}

/** Sonderzeichen nach RFC 5545 maskieren. */
export function maskieren(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Zeilen länger als 75 Byte umbrechen (Fortsetzung beginnt mit Leerzeichen). */
function falten(zeile: string): string {
  const teile: string[] = [];
  let rest = zeile;
  let grenze = 75;
  while (new TextEncoder().encode(rest).length > grenze) {
    let n = grenze;
    while (new TextEncoder().encode(rest.slice(0, n)).length > grenze) n--;
    teile.push(rest.slice(0, n));
    rest = rest.slice(n);
    grenze = 74;
  }
  teile.push(rest);
  return teile.join('\r\n ');
}

const kompakt = (datum: string) => datum.replace(/-/g, '');
const zeitKompakt = (zeitpunkt: string) => `${kompakt(datumTeil(zeitpunkt))}T${uhrzeitTeil(zeitpunkt)!.replace(':', '')}00`;

const RRULE_ART: Record<Wiederholung['art'], string> = {
  taeglich: 'DAILY',
  woechentlich: 'WEEKLY',
  monatlich: 'MONTHLY',
  jaehrlich: 'YEARLY'
};
const ICS_TAGE = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function rrule(w: Wiederholung): string {
  const teile = [`FREQ=${RRULE_ART[w.art]}`];
  if ((w.intervall || 1) > 1) teile.push(`INTERVAL=${w.intervall}`);
  if (w.art === 'woechentlich' && w.wochentage?.length) {
    teile.push(`BYDAY=${[...w.wochentage].sort().map((t) => ICS_TAGE[t - 1]).join(',')}`);
  }
  if (w.bis) teile.push(`UNTIL=${kompakt(w.bis)}T235959`);
  return 'RRULE:' + teile.join(';');
}

function stempel(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function icsErstellen(eintraege: KalenderEintrag[], erstellt = new Date()): string {
  const z: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mein Alltag//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of eintraege) {
    z.push('BEGIN:VEVENT', `UID:${e.uid}@mein-alltag`, `DTSTAMP:${stempel(erstellt)}`);
    if (e.ganztaegig) {
      const start = datumTeil(e.beginn);
      const letzter = e.ende ? datumTeil(e.ende) : start;
      z.push(`DTSTART;VALUE=DATE:${kompakt(start)}`, `DTEND;VALUE=DATE:${kompakt(tageDazu(letzter >= start ? letzter : start, 1))}`);
    } else {
      // „Schwebende“ Ortszeit (ohne Zeitzone): der Kalender nimmt die Zeitzone des Handys.
      const ende = e.ende && e.ende > e.beginn ? e.ende : minutenDazu(e.beginn, 60);
      z.push(`DTSTART:${zeitKompakt(e.beginn)}`, `DTEND:${zeitKompakt(ende)}`);
    }
    z.push(`SUMMARY:${maskieren(e.titel)}`);
    if (e.ort) z.push(`LOCATION:${maskieren(e.ort)}`);
    if (e.notiz) z.push(`DESCRIPTION:${maskieren(e.notiz)}`);
    if (e.wiederholung) z.push(rrule(e.wiederholung));
    if (e.erinnerungMinuten !== undefined) {
      // Ganztägig: wie in der App von 9 Uhr an rechnen (der Kalender rechnet sonst ab Mitternacht).
      const vorlauf = e.ganztaegig ? e.erinnerungMinuten - 9 * 60 : e.erinnerungMinuten;
      z.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${maskieren(e.titel)}`,
        vorlauf <= 0 ? `TRIGGER:PT${-vorlauf}M` : `TRIGGER:-PT${vorlauf}M`,
        'END:VALARM'
      );
    }
    z.push('END:VEVENT');
  }
  z.push('END:VCALENDAR');
  return z.map(falten).join('\r\n') + '\r\n';
}

/** Dateiname ohne problematische Zeichen, z. B. „Zahnarzt-2026-11-28.ics“ */
export function icsDateiname(titel: string, beginn: string): string {
  const sauber = titel.normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'Termin';
  return `${sauber}-${datumTeil(beginn)}.ics`;
}

/** Datei herunterladen; Chrome zeigt danach „Öffnen“ → Kalender-App wählen. */
export function icsHerunterladen(inhalt: string, dateiname: string): void {
  const blob = new Blob([inhalt], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Link, der Google Kalender mit vorausgefülltem Termin öffnet (Alternative zur Datei). */
export function googleKalenderLink(e: KalenderEintrag): string {
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titel });
  if (e.ganztaegig) {
    const start = datumTeil(e.beginn);
    const letzter = e.ende ? datumTeil(e.ende) : start;
    p.set('dates', `${kompakt(start)}/${kompakt(tageDazu(letzter, 1))}`);
  } else {
    const ende = e.ende && e.ende > e.beginn ? e.ende : minutenDazu(e.beginn, 60);
    p.set('dates', `${zeitKompakt(e.beginn)}/${zeitKompakt(ende)}`);
  }
  if (e.ort) p.set('location', e.ort);
  if (e.notiz) p.set('details', e.notiz);
  if (e.wiederholung) p.set('recur', rrule(e.wiederholung));
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// lesen wird für Typprüfung der Eingaben genutzt (ungültige Daten früh erkennen)
export function istGueltig(text: string): boolean {
  return !Number.isNaN(lesen(text).getTime());
}
