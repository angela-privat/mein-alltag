import Dexie, { type EntityTable } from 'dexie';
import type {
  Aufgabe, Termin, Kategorie, Artikel, Einkaufsliste, Listeneintrag, Kassenbon, Vorrat,
  Haushaltsaufgabe, Wochenplan, Erledigung, Rezept, Mahlzeit, Konto, Buchung, Dauerauftrag,
  Budget, Notiz, Datei, Erinnerung, Regel, Vorschlag, Einstellungen
} from './typen';

/**
 * Eindeutiger Datenbankname. „Fit mit Herz“ liegt unter derselben Web-Adresse
 * (angela-privat.github.io) – deshalb NIE einen anderen/gemeinsamen Namen verwenden.
 */
export const DB_NAME = 'mein-alltag';
export const SCHEMA_VERSION = 1;

export class MeinAlltagDB extends Dexie {
  aufgaben!: EntityTable<Aufgabe, 'id'>;
  termine!: EntityTable<Termin, 'id'>;
  kategorien!: EntityTable<Kategorie, 'id'>;
  artikel!: EntityTable<Artikel, 'id'>;
  einkaufslisten!: EntityTable<Einkaufsliste, 'id'>;
  listeneintraege!: EntityTable<Listeneintrag, 'id'>;
  kassenbons!: EntityTable<Kassenbon, 'id'>;
  vorrat!: EntityTable<Vorrat, 'id'>;
  haushaltsaufgaben!: EntityTable<Haushaltsaufgabe, 'id'>;
  wochenplaene!: EntityTable<Wochenplan, 'id'>;
  erledigungen!: EntityTable<Erledigung, 'id'>;
  rezepte!: EntityTable<Rezept, 'id'>;
  mahlzeiten!: EntityTable<Mahlzeit, 'id'>;
  konten!: EntityTable<Konto, 'id'>;
  buchungen!: EntityTable<Buchung, 'id'>;
  dauerauftraege!: EntityTable<Dauerauftrag, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  notizen!: EntityTable<Notiz, 'id'>;
  dateien!: EntityTable<Datei, 'id'>;
  erinnerungen!: EntityTable<Erinnerung, 'id'>;
  regeln!: EntityTable<Regel, 'id'>;
  vorschlaege!: EntityTable<Vorschlag, 'id'>;
  einstellungen!: EntityTable<Einstellungen, 'id'>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      aufgaben: 'id, faelligAm, erledigtAm, kategorieId, geaendertAm, geloeschtAm',
      termine: 'id, beginn, geaendertAm, geloeschtAm',
      kategorien: 'id, bereich, geloeschtAm',
      artikel: 'id, name, abteilung, zuletztGekauftAm, *synonyme, geloeschtAm',
      einkaufslisten: 'id, archiviert, geloeschtAm',
      listeneintraege: 'id, listeId, artikelId, erledigt, geloeschtAm',
      kassenbons: 'id, datum, geschaeft, geloeschtAm',
      vorrat: 'id, artikelId, ablaufAm, geloeschtAm',
      haushaltsaufgaben: 'id, raum, aktiv, geloeschtAm',
      wochenplaene: 'id, wocheBeginn, geloeschtAm',
      erledigungen: 'id, haushaltsaufgabeId, erledigtAm, geloeschtAm',
      rezepte: 'id, name, favorit, *tags, geloeschtAm',
      mahlzeiten: 'id, datum, rezeptId, geloeschtAm',
      konten: 'id, geloeschtAm',
      buchungen: 'id, datum, kontoId, kategorieId, [kontoId+datum], geloeschtAm',
      dauerauftraege: 'id, naechsteFaelligkeit, aktiv, geloeschtAm',
      budgets: 'id, [kategorieId+monat], geloeschtAm',
      notizen: 'id, angeheftet, *tags, geaendertAm, geloeschtAm',
      dateien: 'id, mimeTyp, ablaufAm, geloeschtAm',
      erinnerungen: 'id, zeitpunkt, status, geloeschtAm',
      regeln: 'id, schluessel, geloeschtAm',
      vorschlaege: 'id, status, regel, geloeschtAm',
      einstellungen: 'id'
    });
  }
}

export const db = new MeinAlltagDB();

/** Alle Tabellen mit Inhalten (ohne Einstellungen) – für Papierkorb und Sicherung. */
export const INHALTS_TABELLEN = [
  'aufgaben', 'termine', 'kategorien', 'artikel', 'einkaufslisten', 'listeneintraege',
  'kassenbons', 'vorrat', 'haushaltsaufgaben', 'wochenplaene', 'erledigungen', 'rezepte',
  'mahlzeiten', 'konten', 'buchungen', 'dauerauftraege', 'budgets', 'notizen', 'dateien',
  'erinnerungen', 'regeln', 'vorschlaege'
] as const;

export type InhaltsTabelle = (typeof INHALTS_TABELLEN)[number];
export const ALLE_TABELLEN = [...INHALTS_TABELLEN, 'einstellungen'] as const;
export type Tabelle = (typeof ALLE_TABELLEN)[number];

/** Für die Anzeige im Papierkorb und in der Sicherungs-Vorschau. */
export const TABELLEN_NAMEN: Record<Tabelle, string> = {
  aufgaben: 'Aufgaben', termine: 'Termine', kategorien: 'Kategorien', artikel: 'Artikel',
  einkaufslisten: 'Einkaufslisten', listeneintraege: 'Listeneinträge', kassenbons: 'Kassenbons',
  vorrat: 'Vorrat', haushaltsaufgaben: 'Haushaltsaufgaben', wochenplaene: 'Wochenpläne',
  erledigungen: 'Erledigungen', rezepte: 'Rezepte', mahlzeiten: 'Mahlzeiten', konten: 'Konten',
  buchungen: 'Buchungen', dauerauftraege: 'Daueraufträge', budgets: 'Budgets', notizen: 'Notizen',
  dateien: 'Dateien', erinnerungen: 'Erinnerungen', regeln: 'Regeln', vorschlaege: 'Vorschläge',
  einstellungen: 'Einstellungen'
};
