// @vitest-environment node
// (Node hat echte Blobs – jsdom-Blobs lassen sich in der Test-Datenbank nicht kopieren.)
import { beforeEach, describe, expect, it } from 'vitest';
import { db, DB_NAME, INHALTS_TABELLEN } from '../src/db/datenbank';
import {
  aendern, endgueltigLoeschen, hinzufuegen, inPapierkorb, papierkorbAufraeumen, papierkorbLaden, papierkorbLeeren,
  wiederherstellen
} from '../src/db/basis';
import { einstellungenLaden, einstellungenSpeichern, sicherungFaellig, STANDARD_EINSTELLUNGEN } from '../src/db/einstellungen';
import {
  sicherungEinspielen, sicherungErstellen, sicherungPruefen, sicherungZusammenfassung, SicherungsFehler
} from '../src/db/sicherung';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('Datenbank', () => {
  it('hat einen eigenen, eindeutigen Namen (nicht wie Fit mit Herz)', () => {
    expect(DB_NAME).toBe('mein-alltag');
    expect(db.name).toBe('mein-alltag');
  });

  it('enthält alle Tabellen aus dem Konzept', () => {
    const vorhanden = db.tables.map((t) => t.name).sort();
    expect(vorhanden).toEqual([...INHALTS_TABELLEN, 'einstellungen'].sort());
    expect(vorhanden).toHaveLength(23);
  });

  it('legt Einträge mit Grundfeldern an und ändert sie', async () => {
    const id = await hinzufuegen('aufgaben', { titel: 'Test', prioritaet: 'normal', unteraufgaben: [] });
    const a = await db.aufgaben.get(id);
    expect(a?.titel).toBe('Test');
    expect(a?.erstelltAm).toBeTruthy();
    expect(a?.quelle).toBe('manuell');
    await new Promise((r) => setTimeout(r, 5));
    await aendern('aufgaben', id, { titel: 'Geändert' });
    const b = await db.aufgaben.get(id);
    expect(b?.titel).toBe('Geändert');
    expect(b!.geaendertAm > b!.erstelltAm).toBe(true);
  });
});

describe('Papierkorb', () => {
  it('legt Einträge in den Papierkorb und holt sie zurück', async () => {
    const id = await hinzufuegen('notizen', { titel: 'Einkaufsideen', inhalt: '', tags: [], angeheftet: false, dateiIds: [] });
    await inPapierkorb('notizen', id);
    let korb = await papierkorbLaden();
    expect(korb).toHaveLength(1);
    expect(korb[0]).toMatchObject({ tabelle: 'notizen', titel: 'Einkaufsideen' });

    await wiederherstellen('notizen', id);
    korb = await papierkorbLaden();
    expect(korb).toHaveLength(0);
    expect((await db.notizen.get(id))?.geloeschtAm).toBeUndefined();
  });

  it('entfernt nur Einträge, die älter als 30 Tage sind', async () => {
    const alt = await hinzufuegen('aufgaben', { titel: 'alt', prioritaet: 'normal', unteraufgaben: [] });
    const neu = await hinzufuegen('aufgaben', { titel: 'neu', prioritaet: 'normal', unteraufgaben: [] });
    await db.aufgaben.update(alt, { geloeschtAm: new Date(Date.now() - 31 * 86_400_000).toISOString() });
    await inPapierkorb('aufgaben', neu);
    const entfernt = await papierkorbAufraeumen();
    expect(entfernt).toBe(1);
    expect(await db.aufgaben.get(alt)).toBeUndefined();
    expect(await db.aufgaben.get(neu)).toBeDefined();
  });

  it('leert den Papierkorb, lässt aktive Einträge in Ruhe', async () => {
    const aktiv = await hinzufuegen('rezepte', { name: 'Suppe', portionen: 2, zutaten: [], tags: [], favorit: false });
    const weg = await hinzufuegen('rezepte', { name: 'Kuchen', portionen: 8, zutaten: [], tags: [], favorit: false });
    await inPapierkorb('rezepte', weg);
    expect(await papierkorbLeeren()).toBe(1);
    expect(await db.rezepte.get(aktiv)).toBeDefined();
  });

  it('löscht einzelne Einträge endgültig', async () => {
    const id = await hinzufuegen('konten', { name: 'Bargeld', startbetragCent: 0, archiviert: false });
    await endgueltigLoeschen('konten', id);
    expect(await db.konten.get(id)).toBeUndefined();
  });
});

describe('Einstellungen', () => {
  it('liefert Standardwerte, solange nichts gespeichert ist', async () => {
    expect(await einstellungenLaden()).toEqual(STANDARD_EINSTELLUNGEN);
  });

  it('speichert Änderungen und behält den Rest', async () => {
    await einstellungenSpeichern({ name: 'Anna', design: 'dunkel' });
    await einstellungenSpeichern({ schriftgroesse: 'gross' });
    const e = await einstellungenLaden();
    expect(e).toMatchObject({ name: 'Anna', design: 'dunkel', schriftgroesse: 'gross', sicherungErinnerungTage: 7 });
  });

  it('verliert keine Änderung, wenn mehrere gleichzeitig gespeichert werden', async () => {
    await Promise.all([
      einstellungenSpeichern({ name: 'Anna' }),
      einstellungenSpeichern({ design: 'hell' }),
      einstellungenSpeichern({ schriftgroesse: 'gross' })
    ]);
    expect(await einstellungenLaden()).toMatchObject({ name: 'Anna', design: 'hell', schriftgroesse: 'gross' });
  });

  it('erkennt, wann eine Sicherung fällig ist', () => {
    const heute = new Date('2026-11-23T12:00:00Z');
    expect(sicherungFaellig({ ...STANDARD_EINSTELLUNGEN }, heute)).toBe(true);
    expect(sicherungFaellig({ ...STANDARD_EINSTELLUNGEN, letzteSicherungAm: '2026-11-20T12:00:00Z' }, heute)).toBe(false);
    expect(sicherungFaellig({ ...STANDARD_EINSTELLUNGEN, letzteSicherungAm: '2026-11-10T12:00:00Z' }, heute)).toBe(true);
    expect(sicherungFaellig({ ...STANDARD_EINSTELLUNGEN, sicherungErinnerungTage: 0 }, heute)).toBe(false);
  });
});

describe('Sicherung', () => {
  it('sichert alles und stellt es vollständig wieder her – auch Fotos', async () => {
    await einstellungenSpeichern({ name: 'Anna' });
    const aufgabe = await hinzufuegen('aufgaben', { titel: 'Arzt anrufen', prioritaet: 'hoch', unteraufgaben: [] });
    const bild = new Blob([new Uint8Array([1, 2, 3, 250, 255])], { type: 'image/jpeg' });
    const datei = await hinzufuegen('dateien', { name: 'Bon.jpg', mimeTyp: 'image/jpeg', groesseBytes: 5, daten: bild });

    const text = JSON.stringify(await sicherungErstellen());

    // Alles löschen, dann einspielen
    await Promise.all(db.tables.map((t) => t.clear()));
    const s = sicherungPruefen(text);
    expect(sicherungZusammenfassung(s)).toEqual([
      { tabelle: 'aufgaben', anzahl: 1 },
      { tabelle: 'dateien', anzahl: 1 }
    ]);
    await sicherungEinspielen(s);

    expect((await db.aufgaben.get(aufgabe))?.titel).toBe('Arzt anrufen');
    expect((await einstellungenLaden()).name).toBe('Anna');
    const zurueck = await db.dateien.get(datei);
    const bytes = new Uint8Array(await zurueck!.daten.arrayBuffer());
    expect([...bytes]).toEqual([1, 2, 3, 250, 255]);
    expect(zurueck!.daten.type).toBe('image/jpeg');
  });

  it('ersetzt beim Einspielen die bisherigen Daten', async () => {
    const text = JSON.stringify(await sicherungErstellen()); // leere Sicherung
    await hinzufuegen('aufgaben', { titel: 'neu seit Sicherung', prioritaet: 'normal', unteraufgaben: [] });
    await sicherungEinspielen(sicherungPruefen(text));
    expect(await db.aufgaben.count()).toBe(0);
  });

  it('lehnt fremde oder kaputte Dateien verständlich ab', () => {
    expect(() => sicherungPruefen('kein json')).toThrow(SicherungsFehler);
    expect(() => sicherungPruefen('{"app":"fit-mit-herz"}')).toThrow('keine Sicherung von „Mein Alltag“');
    const zuNeu = JSON.stringify({ app: 'mein-alltag', format: 1, schemaVersion: 99, erstelltAm: '', tabellen: {} });
    expect(() => sicherungPruefen(zuNeu)).toThrow('neueren App-Version');
  });
});
