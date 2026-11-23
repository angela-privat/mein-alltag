// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/datenbank';
import { naechstesVorkommen, vorkommenImBereich, wiederholungLesbar } from '../src/lib/wiederholung';
import { icsErstellen, maskieren, icsDateiname, googleKalenderLink } from '../src/lib/ics';
import { aufgabeErledigen, aufgabeLoeschen, aufgabeSpeichern, aufgabeZuruecksetzen, aufgabenGruppieren, type NeueAufgabe } from '../src/db/aufgaben';
import { terminLoeschen, termineImBereich, terminSpeichern } from '../src/db/termine';
import {
  erinnerungErledigen, erinnerungVerschieben, faelligeErinnerungen, freieErinnerungSpeichern, neuFaelligMarkieren
} from '../src/db/erinnerungen';
import { tagLesbar } from '../src/lib/zeit';

const aufgabe = (t: Partial<NeueAufgabe> = {}): NeueAufgabe => ({ titel: 'Test', prioritaet: 'normal', unteraufgaben: [], ...t });
const um = (text: string) => new Date(text); // Ortszeit

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Wiederholung', () => {
  it('täglich, alle 2 Tage', () => {
    expect(vorkommenImBereich('2026-11-01', { art: 'taeglich', intervall: 2 }, '2026-11-04', '2026-11-10')).toEqual([
      '2026-11-05', '2026-11-07', '2026-11-09'
    ]);
  });
  it('wöchentlich an Mo und Do', () => {
    // 2026-11-23 ist ein Montag
    expect(
      vorkommenImBereich('2026-11-23', { art: 'woechentlich', intervall: 1, wochentage: [4, 1] }, '2026-11-23', '2026-12-03')
    ).toEqual(['2026-11-23', '2026-11-26', '2026-11-30', '2026-12-03']);
  });
  it('alle 2 Wochen, ohne Wochentage = Wochentag des Starts', () => {
    expect(vorkommenImBereich('2026-11-25', { art: 'woechentlich', intervall: 2 }, '2026-11-01', '2026-12-31')).toEqual([
      '2026-11-25', '2026-12-09', '2026-12-23'
    ]);
  });
  it('monatlich am 31. wandert nicht', () => {
    const w = { art: 'monatlich' as const, intervall: 1 };
    expect(vorkommenImBereich('2026-01-31', w, '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'
    ]);
  });
  it('jährlich und Ende „bis“', () => {
    const w = { art: 'jaehrlich' as const, intervall: 1, bis: '2028-12-31' };
    expect(naechstesVorkommen('2024-02-29', w, '2026-03-01')).toBe('2027-02-28');
    expect(naechstesVorkommen('2024-05-01', w, '2028-05-01')).toBeNull();
  });
  it('lange Reihen sind schnell (Sprung zum Bereich)', () => {
    const r = vorkommenImBereich('2000-01-01', { art: 'taeglich', intervall: 1 }, '2026-11-23', '2026-11-24');
    expect(r).toEqual(['2026-11-23', '2026-11-24']);
  });
  it('lesbar', () => {
    expect(wiederholungLesbar({ art: 'woechentlich', intervall: 1, wochentage: [5, 1] })).toBe('Jede Woche (Mo, Fr)');
    expect(wiederholungLesbar({ art: 'monatlich', intervall: 3 })).toBe('Alle 3 Monate');
  });
});

describe('Kalenderdatei (.ics)', () => {
  it('Termin mit Uhrzeit, Wiederholung und Erinnerung', () => {
    const ics = icsErstellen(
      [
        {
          uid: 'abc', titel: 'Zahnarzt; Kontrolle, jährlich', beginn: '2026-11-28T14:30', ende: '2026-11-28T15:00',
          ganztaegig: false, ort: 'Praxis', wiederholung: { art: 'woechentlich', intervall: 2, wochentage: [6] },
          erinnerungMinuten: 60
        }
      ],
      new Date('2026-11-23T10:00:00Z')
    );
    expect(ics).toContain('DTSTART:20261128T143000\r\n');
    expect(ics).toContain('DTEND:20261128T150000\r\n');
    expect(ics).toContain('SUMMARY:Zahnarzt\\; Kontrolle\\, jährlich');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SA');
    expect(ics).toContain('TRIGGER:-PT60M');
    expect(ics).toContain('DTSTAMP:20261123T100000Z');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });
  it('ganztägig mehrtägig: DTEND ist der Tag danach', () => {
    const ics = icsErstellen([{ uid: 'u', titel: 'Urlaub', beginn: '2026-12-22', ende: '2026-12-24', ganztaegig: true }]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261222');
    expect(ics).toContain('DTEND;VALUE=DATE:20261225');
    expect(ics).not.toContain('VALARM');
  });
  it('lange Zeilen werden umgebrochen', () => {
    const ics = icsErstellen([{ uid: 'u', titel: 'Ä'.repeat(100), beginn: '2026-12-22', ganztaegig: true }]);
    for (const zeile of ics.split('\r\n')) expect(new TextEncoder().encode(zeile).length).toBeLessThanOrEqual(75);
  });
  it('Hilfen', () => {
    expect(maskieren('a\nb')).toBe('a\\nb');
    expect(icsDateiname('Zahnarzt: Kontrolle!', '2026-11-28T14:30')).toBe('Zahnarzt-Kontrolle-2026-11-28.ics');
    expect(googleKalenderLink({ uid: 'x', titel: 'A', beginn: '2026-11-28T14:30', ganztaegig: false })).toContain(
      'dates=20261128T143000%2F20261128T153000'
    );
  });
});

describe('Aufgaben', () => {
  it('gruppiert nach Fälligkeit', () => {
    const jetzt = um('2026-11-23T10:00');
    const basis = { id: '', erstelltAm: '2026-01-01', geaendertAm: '', prioritaet: 'normal' as const, unteraufgaben: [] };
    const g = aufgabenGruppieren(
      [
        { ...basis, id: '1', titel: 'alt', faelligAm: '2026-11-20' },
        { ...basis, id: '2', titel: 'heute', faelligAm: '2026-11-23' },
        { ...basis, id: '3', titel: 'morgen', faelligAm: '2026-11-24' },
        { ...basis, id: '4', titel: 'später', faelligAm: '2026-12-01' },
        { ...basis, id: '5', titel: 'irgendwann' },
        { ...basis, id: '6', titel: 'fertig', erledigtAm: '2026-11-22T10:00:00Z' },
        { ...basis, id: '7', titel: 'weg', geloeschtAm: '2026-11-22T10:00:00Z' }
      ],
      jetzt
    );
    expect(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map((a: { id: string }) => a.id)]))).toEqual({
      ueberfaellig: ['1'], heute: ['2'], morgen: ['3'], spaeter: ['4'], ohneDatum: ['5'], erledigt: ['6']
    });
  });

  it('einfache Aufgabe abhaken und rückgängig machen', async () => {
    const id = await aufgabeSpeichern(aufgabe({ faelligAm: '2026-11-23' }));
    const r = await aufgabeErledigen(id);
    expect(r.naechsteFaelligkeit).toBeUndefined();
    expect((await db.aufgaben.get(id))!.erledigtAm).toBeTruthy();
    await aufgabeZuruecksetzen(r.vorher);
    expect((await db.aufgaben.get(id))!.erledigtAm).toBeUndefined();
  });

  it('wiederkehrende Aufgabe rückt vor und setzt Unteraufgaben zurück', async () => {
    const id = await aufgabeSpeichern(
      aufgabe({
        faelligAm: '2026-11-20',
        wiederholung: { art: 'woechentlich', intervall: 1 },
        unteraufgaben: [{ id: 'u', titel: 'Teil', erledigt: true }]
      })
    );
    // überfällig (Fr 20.11.), erledigt am Mo 23.11. → nächster Freitag
    const r = await aufgabeErledigen(id, um('2026-11-23T10:00'));
    expect(r.naechsteFaelligkeit).toBe('2026-11-27');
    const a = (await db.aufgaben.get(id))!;
    expect(a.erledigtAm).toBeUndefined();
    expect(a.unteraufgaben[0].erledigt).toBe(false);
    expect(a.wiederholung!.anker).toBe('2026-11-20');
  });

  it('geleerte Felder werden beim Ändern entfernt', async () => {
    const id = await aufgabeSpeichern(aufgabe({ faelligAm: '2026-11-23', uhrzeit: '10:00', erinnerungMinuten: 0 }));
    await aufgabeSpeichern(aufgabe({}), id);
    const a = (await db.aufgaben.get(id))!;
    expect(a.faelligAm).toBeUndefined();
    expect(a.uhrzeit).toBeUndefined();
    expect(await db.erinnerungen.count()).toBe(0);
  });
});

describe('Termine im Kalender', () => {
  it('wiederkehrende und mehrtägige Termine', async () => {
    await terminSpeichern({ titel: 'Yoga', beginn: '2026-11-02T18:00', ende: '2026-11-02T19:00', ganztaegig: false, wiederholung: { art: 'woechentlich', intervall: 1 } });
    await terminSpeichern({ titel: 'Urlaub', beginn: '2026-11-29', ende: '2026-12-01', ganztaegig: true });
    const liste = termineImBereich(await db.termine.toArray(), '2026-11-30', '2026-12-01');
    expect(liste.map((v) => `${v.tag} ${v.termin.titel} ${v.beginn}`)).toEqual([
      '2026-11-30 Urlaub 2026-11-29',
      '2026-11-30 Yoga 2026-11-30T18:00',
      '2026-12-01 Urlaub 2026-11-29'
    ]);
    expect(liste[0].mehrtaegig).toEqual({ tag: 2, von: 3 });
  });
});

describe('Erinnerungen', () => {
  it('Aufgabe mit Erinnerung erzeugt, ändert und entfernt die Erinnerung', async () => {
    const id = await aufgabeSpeichern(aufgabe({ titel: 'Arzt anrufen', faelligAm: '2026-11-24', uhrzeit: '10:00', erinnerungMinuten: 15 }));
    let e = await db.erinnerungen.toArray();
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ zeitpunkt: '2026-11-24T09:45', text: 'Arzt anrufen', bezug: { typ: 'aufgabe', id } });
    await aufgabeSpeichern(aufgabe({ titel: 'Arzt anrufen', faelligAm: '2026-11-24', erinnerungMinuten: 1440 }), id);
    e = await db.erinnerungen.toArray();
    expect(e[0].zeitpunkt).toBe('2026-11-23T09:00'); // ohne Uhrzeit: 9 Uhr, 1 Tag vorher
    await aufgabeErledigen(id);
    expect(await db.erinnerungen.count()).toBe(0);
  });

  it('gelöschte Aufgabe nimmt ihre Erinnerung mit', async () => {
    const id = await aufgabeSpeichern(aufgabe({ faelligAm: '2026-11-24', erinnerungMinuten: 0 }));
    await aufgabeLoeschen(id);
    expect(await db.erinnerungen.count()).toBe(0);
  });

  it('wiederkehrender Termin: Erinnerung springt nach „Erledigt“ weiter', async () => {
    const jetzt = um('2026-11-23T08:00');
    const id = await terminSpeichern({
      titel: 'Müll rausstellen', beginn: '2026-11-02T07:00', ganztaegig: false,
      wiederholung: { art: 'woechentlich', intervall: 1 }, erinnerungMinuten: 720
    });
    // Termine vom Montag 23.11. 7:00 ist schon vorbei → nächster Montag 30.11.
    const { erinnerungAbgleichen } = await import('../src/db/erinnerungen');
    await erinnerungAbgleichen('termin', id, jetzt);
    let e = (await db.erinnerungen.toArray())[0];
    expect(e.vorkommen).toBe('2026-11-30T07:00');
    expect(e.zeitpunkt).toBe('2026-11-29T19:00');
    await erinnerungErledigen(e.id, um('2026-11-29T19:05'));
    e = (await db.erinnerungen.toArray())[0];
    expect(e).toMatchObject({ vorkommen: '2026-12-07T07:00', zeitpunkt: '2026-12-06T19:00', status: 'offen' });
    await terminLoeschen(id);
    expect(await db.erinnerungen.count()).toBe(0);
  });

  it('fällig, gezeigt, verpasst, verschoben', async () => {
    const id = await freieErinnerungSpeichern({ text: 'Blumen gießen', zeitpunkt: '2026-11-23T09:00' });
    expect(await faelligeErinnerungen(um('2026-11-23T08:59'))).toHaveLength(0);
    // Wächter um 9:10 → frisch, wird gemeldet
    expect((await neuFaelligMarkieren(um('2026-11-23T09:10'))).map((e) => e.id)).toEqual([id]);
    // zweites Mal nicht mehr
    expect(await neuFaelligMarkieren(um('2026-11-23T09:11'))).toHaveLength(0);
    // bleibt aber in der „Verpasst“-Liste
    expect(await faelligeErinnerungen(um('2026-11-23T12:00'))).toHaveLength(1);
    await erinnerungVerschieben(id, 60, um('2026-11-23T12:00'));
    expect(await faelligeErinnerungen(um('2026-11-23T12:30'))).toHaveLength(0);
    expect(await faelligeErinnerungen(um('2026-11-23T13:00'))).toHaveLength(1);
    await erinnerungErledigen(id);
    expect(await faelligeErinnerungen(um('2026-11-24T13:00'))).toHaveLength(0);
  });

  it('alte Erinnerungen (beim App-Start) melden nicht, landen aber in „Verpasst“', async () => {
    await freieErinnerungSpeichern({ text: 'Alt', zeitpunkt: '2026-11-20T09:00' });
    expect(await neuFaelligMarkieren(um('2026-11-23T09:00'))).toHaveLength(0);
    expect(await faelligeErinnerungen(um('2026-11-23T09:00'))).toHaveLength(1);
  });

  it('tägliche freie Erinnerung springt auf morgen', async () => {
    const id = await freieErinnerungSpeichern({ text: 'Tabletten', zeitpunkt: '2026-11-20T08:00', wiederholung: { art: 'taeglich', intervall: 1 } });
    const neu = await erinnerungErledigen(id, um('2026-11-23T10:00'));
    expect(neu).toBe('2026-11-24T08:00');
  });
});

describe('Zeit', () => {
  it('heute/morgen/gestern', () => {
    const j = um('2026-11-23T10:00');
    expect(tagLesbar('2026-11-23', j)).toBe('heute');
    expect(tagLesbar('2026-11-24', j)).toBe('morgen');
    expect(tagLesbar('2026-11-22', j)).toBe('gestern');
    expect(tagLesbar('2026-11-27', j)).toBe('Fr., 27. Nov.');
  });
});
