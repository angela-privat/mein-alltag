// Datenmodell „Mein Alltag“ (siehe KONZEPT.md, Abschnitt 7).
// Geldbeträge immer in Cent (ganze Zahl), Datum ohne Uhrzeit als "JJJJ-MM-TT".

export type Quelle = 'manuell' | 'ocr' | 'assistent' | 'import' | 'fitness';

export interface Basis {
  id: string;
  erstelltAm: string;
  geaendertAm: string;
  geloeschtAm?: string;
  quelle?: Quelle;
}

export interface Wiederholung {
  art: 'taeglich' | 'woechentlich' | 'monatlich' | 'jaehrlich';
  intervall: number;
  wochentage?: number[];
  bis?: string;
}

// 7.1 Aufgaben & Kalender
export interface Aufgabe extends Basis {
  titel: string;
  notiz?: string;
  faelligAm?: string;
  uhrzeit?: string;
  prioritaet: 'niedrig' | 'normal' | 'hoch';
  kategorieId?: string;
  erledigtAm?: string;
  wiederholung?: Wiederholung;
  unteraufgaben: { id: string; titel: string; erledigt: boolean }[];
}

export interface Termin extends Basis {
  titel: string;
  ort?: string;
  beginn: string;
  ende?: string;
  ganztaegig: boolean;
  farbe?: string;
  wiederholung?: Wiederholung;
  notiz?: string;
}

export interface Kategorie extends Basis {
  name: string;
  farbe: string;
  bereich: 'aufgabe' | 'termin' | 'finanzen' | 'notiz';
}

// 7.2 Einkauf
export interface Artikel extends Basis {
  name: string;
  synonyme: string[];
  abteilung: string;
  standardMenge?: string;
  letzterPreisCent?: number;
  kaufIntervallTage?: number;
  zuletztGekauftAm?: string;
}

export interface Einkaufsliste extends Basis {
  name: string;
  geschaeft?: string;
  archiviert: boolean;
}

export interface Listeneintrag extends Basis {
  listeId: string;
  artikelId?: string;
  text: string;
  menge?: string;
  erledigt: boolean;
  herkunft?: 'manuell' | 'essensplan' | 'vorrat' | 'ocr-zettel';
}

export interface Kassenbon extends Basis {
  geschaeft?: string;
  datum: string;
  summeCent: number;
  fotoId?: string;
  ocrRohtext?: string;
  positionen: { text: string; artikelId?: string; menge?: number; preisCent: number }[];
  geprueft: boolean;
  buchungId?: string;
}

export interface Vorrat extends Basis {
  artikelId: string;
  menge?: string;
  ablaufAm?: string;
  mindestMenge?: string;
}

// 7.3 Haushalt
export interface Haushaltsaufgabe extends Basis {
  titel: string;
  raum?: string;
  sollIntervallTage: number;
  dauerMinutenGeschaetzt: number;
  dauerMinutenGelernt?: number;
  bevorzugteWochentage?: number[];
  energie: 'leicht' | 'mittel' | 'anstrengend';
  aktiv: boolean;
}

export interface Wochenplan extends Basis {
  wocheBeginn: string;
  eintraege: { haushaltsaufgabeId: string; tag: string; reihenfolge: number }[];
  zeitbudgetMinutenProTag?: Record<number, number>;
}

export interface Erledigung extends Basis {
  haushaltsaufgabeId: string;
  erledigtAm: string;
  dauerMinuten?: number;
  verschoben?: boolean;
  aufwandGefuehlt?: 1 | 2 | 3 | 4 | 5;
}

// 7.4 Essen
export interface Rezept extends Basis {
  name: string;
  portionen: number;
  zutaten: { artikelId?: string; text: string; menge?: number; einheit?: string }[];
  anleitung?: string;
  zeitMinuten?: number;
  tags: string[];
  fotoId?: string;
  favorit: boolean;
}

export interface Mahlzeit extends Basis {
  datum: string;
  art: 'fruehstueck' | 'mittag' | 'abend' | 'snack';
  rezeptId?: string;
  freitext?: string;
  portionen?: number;
}

// 7.5 Finanzen
export interface Konto extends Basis {
  name: string;
  startbetragCent: number;
  archiviert: boolean;
}

export interface Buchung extends Basis {
  kontoId: string;
  datum: string;
  betragCent: number;
  kategorieId?: string;
  beschreibung?: string;
  kassenbonId?: string;
  dauerauftragId?: string;
}

export interface Dauerauftrag extends Basis {
  name: string;
  betragCent: number;
  kontoId: string;
  kategorieId?: string;
  wiederholung: Wiederholung;
  naechsteFaelligkeit: string;
  aktiv: boolean;
}

export interface Budget extends Basis {
  kategorieId: string;
  monat: string;
  betragCent: number;
}

// 7.6 Notizen & Dokumente
export interface Notiz extends Basis {
  titel: string;
  inhalt: string;
  tags: string[];
  angeheftet: boolean;
  dateiIds: string[];
}

export interface Datei extends Basis {
  name: string;
  mimeTyp: string;
  groesseBytes: number;
  daten: Blob;
  vorschau?: Blob;
  ocrText?: string;
  ablaufAm?: string;
}

// 7.7 Erinnerungen
export interface Erinnerung extends Basis {
  bezug: { typ: 'aufgabe' | 'termin' | 'haushalt' | 'dauerauftrag' | 'datei' | 'frei'; id?: string };
  text: string;
  zeitpunkt: string;
  wiederholung?: Wiederholung;
  status: 'offen' | 'gezeigt' | 'erledigt' | 'verschoben';
  imKalenderExportiert: boolean;
}

// 7.8 Assistent & Einstellungen
export interface Regel extends Basis {
  schluessel: string;
  aktiv: boolean;
  parameter?: Record<string, number | string>;
}

export interface Vorschlag extends Basis {
  regel: string;
  text: string;
  aktion?: { typ: string; daten: unknown };
  status: 'neu' | 'angenommen' | 'abgelehnt';
}

export type Design = 'hell' | 'dunkel' | 'system';
export type Schriftgroesse = 'normal' | 'gross' | 'sehrGross';

export interface Einstellungen {
  id: 'einstellungen';
  name?: string;
  design: Design;
  schriftgroesse: Schriftgroesse;
  wochenstart: 1;
  sicherungErinnerungTage: number;
  letzteSicherungAm?: string;
  appSperrePinHash?: string;
  module: Record<string, boolean>;
  schemaVersion: number;
}
