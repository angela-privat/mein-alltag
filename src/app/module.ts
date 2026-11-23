import {
  Bell, CalendarCheck, FileText, House, ShoppingBasket, UtensilsCrossed, Wallet, type LucideIcon
} from 'lucide-react';

/** Übersicht aller Module mit Farbe, Symbol und geplanter Phase (siehe KONZEPT.md Abschnitt 9). */
export interface ModulInfo {
  schluessel: string;
  name: string;
  pfad: string;
  symbol: LucideIcon;
  farbe: string;
  phase: number;
  kurz: string;
  geplant: string[];
}

export const MODUL_INFOS: ModulInfo[] = [
  {
    schluessel: 'aufgaben', name: 'Aufgaben & Kalender', pfad: '/aufgaben', symbol: CalendarCheck,
    farbe: 'var(--m-aufgaben)', phase: 3, kurz: 'To-dos und Termine',
    geplant: ['Aufgaben mit Fälligkeit und Wiederholung', 'Kalender: Monat, Woche, Tag', 'Termine in den Handy-Kalender übernehmen']
  },
  {
    schluessel: 'einkauf', name: 'Einkauf', pfad: '/einkauf', symbol: ShoppingBasket,
    farbe: 'var(--m-einkauf)', phase: 4, kurz: 'Listen & Kassenbons',
    geplant: ['Einkaufslisten nach Abteilungen', 'Einkaufszettel einfügen (z. B. aus Google Lens)', 'Kassenbon fotografieren und prüfen']
  },
  {
    schluessel: 'haushalt', name: 'Haushalt', pfad: '/haushalt', symbol: House,
    farbe: 'var(--m-haushalt)', phase: 5, kurz: 'Wochenplan & Putzen',
    geplant: ['Haushaltsaufgaben mit Rhythmus', 'Wochenplan mit Zeitbudget', 'Lernt, was wirklich klappt']
  },
  {
    schluessel: 'essen', name: 'Essensplaner', pfad: '/essen', symbol: UtensilsCrossed,
    farbe: 'var(--m-essen)', phase: 5, kurz: 'Rezepte & Wochenplan',
    geplant: ['Rezepte sammeln', 'Essen für die Woche planen', 'Zutaten auf die Einkaufsliste']
  },
  {
    schluessel: 'finanzen', name: 'Finanzen', pfad: '/finanzen', symbol: Wallet,
    farbe: 'var(--m-finanzen)', phase: 6, kurz: 'Ausgaben & Budget',
    geplant: ['Einnahmen und Ausgaben', 'Monatsbudgets je Kategorie', 'Kassenbon wird zur Buchung']
  },
  {
    schluessel: 'notizen', name: 'Notizen & Dokumente', pfad: '/notizen', symbol: FileText,
    farbe: 'var(--m-notizen)', phase: 6, kurz: 'Notizen, Fotos, PDFs',
    geplant: ['Notizen mit Checklisten', 'Fotos und PDFs ablegen', 'Hinweis vor Ablaufdaten']
  },
  {
    schluessel: 'erinnerungen', name: 'Erinnerungen', pfad: '/erinnerungen', symbol: Bell,
    farbe: 'var(--m-erinnerungen)', phase: 3, kurz: 'Nichts vergessen',
    geplant: ['Erinnerungen in der App', 'Liste „Verpasst“', 'Übernahme in den Handy-Kalender']
  }
];

export function modulInfo(schluessel: string): ModulInfo {
  return MODUL_INFOS.find((m) => m.schluessel === schluessel)!;
}
