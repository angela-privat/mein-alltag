import { z } from 'zod';
import { db, ALLE_TABELLEN, SCHEMA_VERSION, type Tabelle } from './datenbank';
import { einstellungenSpeichern } from './einstellungen';

/**
 * Sicherungsdatei: eine JSON-Datei mit allen Tabellen.
 * Dateien (Fotos/PDFs) werden als Base64-Text eingebettet.
 */
export const SICHERUNG_FORMAT = 1;

const BLOB_MARKE = '__blob__';
interface BlobText {
  [BLOB_MARKE]: true;
  typ: string;
  base64: string;
}

async function blobZuText(b: Blob): Promise<BlobText> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let binaer = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binaer += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { [BLOB_MARKE]: true, typ: b.type, base64: btoa(binaer) };
}

function textZuBlob(t: BlobText): Blob {
  const binaer = atob(t.base64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return new Blob([bytes], { type: t.typ });
}

function istBlobText(w: unknown): w is BlobText {
  return typeof w === 'object' && w !== null && (w as Record<string, unknown>)[BLOB_MARKE] === true;
}

async function ersetzeBlobs(e: Record<string, unknown>): Promise<Record<string, unknown>> {
  const neu: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) neu[k] = v instanceof Blob ? await blobZuText(v) : v;
  return neu;
}

function stelleBlobsWieder(e: Record<string, unknown>): Record<string, unknown> {
  const neu: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) neu[k] = istBlobText(v) ? textZuBlob(v) : v;
  return neu;
}

const SicherungSchema = z.object({
  app: z.literal('mein-alltag'),
  format: z.number().int().min(1).max(SICHERUNG_FORMAT),
  schemaVersion: z.number().int().min(1),
  erstelltAm: z.string(),
  tabellen: z.record(z.string(), z.array(z.record(z.string(), z.unknown())))
});

export type Sicherung = z.infer<typeof SicherungSchema>;

export async function sicherungErstellen(): Promise<Sicherung> {
  const tabellen: Record<string, Record<string, unknown>[]> = {};
  for (const name of ALLE_TABELLEN) {
    const zeilen = (await db.table(name).toArray()) as Record<string, unknown>[];
    tabellen[name] = await Promise.all(zeilen.map(ersetzeBlobs));
  }
  return {
    app: 'mein-alltag',
    format: SICHERUNG_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    erstelltAm: new Date().toISOString(),
    tabellen
  };
}

export function sicherungDateiname(datum = new Date()): string {
  const d = datum.toISOString().slice(0, 10);
  return `Sicherung-${d}.mein-alltag.json`;
}

/**
 * Erstellt die Sicherung und gibt sie aus: auf dem Handy über „Teilen“
 * (z. B. direkt in Google Drive), sonst als Download.
 * Gibt den Dateinamen zurück, oder null, wenn abgebrochen wurde.
 */
export async function sicherungHerunterladen(): Promise<string | null> {
  const daten = await sicherungErstellen();
  const name = sicherungDateiname();
  const datei = new File([JSON.stringify(daten)], name, { type: 'application/json' });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [datei] })) {
    try {
      await nav.share({ files: [datei], title: 'Mein Alltag – Sicherung' });
      await einstellungenSpeichern({ letzteSicherungAm: new Date().toISOString() });
      return name;
    } catch (fehler) {
      if ((fehler as DOMException).name === 'AbortError') return null;
      // sonst weiter mit normalem Download
    }
  }
  const url = URL.createObjectURL(datei);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await einstellungenSpeichern({ letzteSicherungAm: new Date().toISOString() });
  return name;
}

export class SicherungsFehler extends Error {}

export function sicherungPruefen(text: string): Sicherung {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    throw new SicherungsFehler('Die Datei ist keine gültige Sicherung (Inhalt nicht lesbar).');
  }
  const ergebnis = SicherungSchema.safeParse(roh);
  if (!ergebnis.success) throw new SicherungsFehler('Diese Datei ist keine Sicherung von „Mein Alltag“.');
  if (ergebnis.data.schemaVersion > SCHEMA_VERSION) {
    throw new SicherungsFehler('Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.');
  }
  return ergebnis.data;
}

/** Zählt die Einträge je Tabelle (für die Vorschau vor dem Einspielen). */
export function sicherungZusammenfassung(s: Sicherung): { tabelle: Tabelle; anzahl: number }[] {
  return ALLE_TABELLEN.filter((t) => t !== 'einstellungen')
    .map((t) => ({ tabelle: t, anzahl: s.tabellen[t]?.length ?? 0 }))
    .filter((z) => z.anzahl > 0);
}

/** Ersetzt ALLE Daten durch die Sicherung. Alles oder nichts (eine Transaktion). */
export async function sicherungEinspielen(s: Sicherung): Promise<void> {
  const tabellen = ALLE_TABELLEN.map((n) => db.table(n));
  await db.transaction('rw', tabellen, async () => {
    for (const name of ALLE_TABELLEN) {
      const t = db.table(name);
      await t.clear();
      const zeilen = (s.tabellen[name] ?? []).map(stelleBlobsWieder);
      if (zeilen.length) await t.bulkPut(zeilen);
    }
  });
}
