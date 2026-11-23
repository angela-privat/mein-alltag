import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Trash2 } from 'lucide-react';
import { db } from '../../db/datenbank';
import { aendern, inPapierkorb, wiederherstellen } from '../../db/basis';
import type { Wiederholung } from '../../db/typen';
import { freieErinnerungSpeichern } from '../../db/erinnerungen';
import { datumTeil, heute, uhrzeitTeil, verbinden } from '../../lib/zeit';
import { Kopf, useMeldung, useZurueck } from '../../ui/bausteine';
import { KalenderExport, WiederholungFeld } from '../aufgaben/felder';

interface Formular {
  text: string;
  datum: string;
  uhrzeit: string;
  wiederholung?: Wiederholung;
}

export function ErinnerungBearbeiten() {
  const { id } = useParams();
  const [suche] = useSearchParams();
  const zurueck = useZurueck('/erinnerungen');
  const melden = useMeldung();
  const neu = !id;
  const vorschlag = suche.get('zeit');
  const [form, setForm] = useState<Formular | null>(
    neu ? { text: '', datum: vorschlag ? datumTeil(vorschlag) : heute(), uhrzeit: (vorschlag && uhrzeitTeil(vorschlag)) || '09:00' } : null
  );
  const [hinweis, setHinweis] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    db.erinnerungen.get(id).then((e) => {
      if (!e || e.geloeschtAm) setHinweis('Diese Erinnerung gibt es nicht mehr.');
      else if (e.bezug.typ !== 'frei') setHinweis('Diese Erinnerung gehört zu einer Aufgabe oder einem Termin und wird dort geändert.');
      else setForm({ text: e.text, datum: datumTeil(e.zeitpunkt), uhrzeit: uhrzeitTeil(e.zeitpunkt) ?? '09:00', wiederholung: e.wiederholung });
    });
  }, [id]);

  if (hinweis) {
    return (
      <>
        <Kopf titel="Erinnerung" zurueck="/erinnerungen" />
        <p className="leer">{hinweis}</p>
      </>
    );
  }
  if (!form) return <Kopf titel="Erinnerung" zurueck="/erinnerungen" />;
  const setzen = (a: Partial<Formular>) => setForm((f) => ({ ...f!, ...a }));

  async function speichern(e: FormEvent) {
    e.preventDefault();
    if (!form!.text.trim()) return;
    await freieErinnerungSpeichern({ text: form!.text, zeitpunkt: verbinden(form!.datum, form!.uhrzeit), wiederholung: form!.wiederholung }, id);
    melden({ text: 'Erinnerung gespeichert.' });
    zurueck();
  }

  async function loeschen() {
    await inPapierkorb('erinnerungen', id!);
    melden({ text: 'In den Papierkorb gelegt.', aktion: { text: 'Rückgängig', ausfuehren: () => wiederherstellen('erinnerungen', id!) } });
    zurueck();
  }

  return (
    <>
      <Kopf titel={neu ? 'Neue Erinnerung' : 'Erinnerung bearbeiten'} zurueck="/erinnerungen" />
      <form onSubmit={speichern}>
        <section className="karte">
          <label className="feld">
            <span>Woran soll ich dich erinnern?</span>
            <input type="text" value={form.text} onChange={(e) => setzen({ text: e.target.value })} autoFocus={neu} required />
          </label>
          <div className="zwei-spalten">
            <label className="feld">
              <span>Tag</span>
              <input type="date" value={form.datum} required onChange={(e) => setzen({ datum: e.target.value })} />
            </label>
            <label className="feld">
              <span>Uhrzeit</span>
              <input type="time" value={form.uhrzeit} required onChange={(e) => setzen({ uhrzeit: e.target.value })} />
            </label>
          </div>
          <WiederholungFeld wert={form.wiederholung} datum={form.datum} onChange={(w) => setzen({ wiederholung: w })} />
        </section>
        <button type="submit" className="knopf breit" style={{ marginBottom: 16 }} disabled={!form.text.trim() || !form.datum || !form.uhrzeit}>
          Speichern
        </button>
      </form>

      {id && (
        <KalenderExport
          eintrag={{
            uid: id,
            titel: form.text,
            beginn: verbinden(form.datum, form.uhrzeit),
            ganztaegig: false,
            wiederholung: form.wiederholung,
            erinnerungMinuten: 0
          }}
          onExportiert={() => aendern('erinnerungen', id, { imKalenderExportiert: true })}
        />
      )}

      {!neu && (
        <button type="button" className="knopf zweitrangig breit" onClick={loeschen} style={{ color: 'var(--akzent)' }}>
          <Trash2 size={20} aria-hidden /> Erinnerung löschen
        </button>
      )}
    </>
  );
}
