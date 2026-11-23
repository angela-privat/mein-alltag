import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Trash2 } from 'lucide-react';
import { db } from '../../db/datenbank';
import type { Termin, Wiederholung } from '../../db/typen';
import { terminLoeschen, terminSpeichern, terminWiederherstellen } from '../../db/termine';
import { datumTeil, heute, minutenDazu, uhrzeitTeil } from '../../lib/zeit';
import { Kopf, Schalter, useMeldung, useZurueck } from '../../ui/bausteine';
import { ErinnerungFeld, KalenderExport, WiederholungFeld } from './felder';

interface Formular {
  titel: string;
  datum: string;
  ganztaegig: boolean;
  von: string;
  bis: string;
  letzterTag: string;
  ort: string;
  notiz: string;
  wiederholung?: Wiederholung;
  erinnerungMinuten?: number;
}

function ausTermin(t: Termin): Formular {
  return {
    titel: t.titel,
    datum: datumTeil(t.beginn),
    ganztaegig: t.ganztaegig,
    von: uhrzeitTeil(t.beginn) ?? '09:00',
    bis: (t.ende && uhrzeitTeil(t.ende)) ?? '',
    letzterTag: t.ganztaegig && t.ende ? datumTeil(t.ende) : '',
    ort: t.ort ?? '',
    notiz: t.notiz ?? '',
    wiederholung: t.wiederholung,
    erinnerungMinuten: t.erinnerungMinuten
  };
}

/** Formular → gespeicherte Felder */
function zuTermin(f: Formular) {
  const beginn = f.ganztaegig ? f.datum : `${f.datum}T${f.von}`;
  let ende: string | undefined;
  if (f.ganztaegig) ende = f.letzterTag && f.letzterTag > f.datum ? f.letzterTag : undefined;
  else ende = f.bis && f.bis > f.von ? `${f.datum}T${f.bis}` : undefined;
  return {
    titel: f.titel,
    beginn,
    ende,
    ganztaegig: f.ganztaegig,
    ort: f.ort.trim() || undefined,
    notiz: f.notiz.trim() || undefined,
    wiederholung: f.wiederholung,
    erinnerungMinuten: f.erinnerungMinuten
  };
}

export function TerminBearbeiten() {
  const { id } = useParams();
  const [suche] = useSearchParams();
  const zurueck = useZurueck('/aufgaben/kalender');
  const melden = useMeldung();
  const neu = !id;
  const [form, setForm] = useState<Formular | null>(
    neu
      ? {
          titel: '', datum: suche.get('datum') ?? heute(), ganztaegig: false, von: '09:00', bis: '10:00',
          letzterTag: '', ort: '', notiz: '', erinnerungMinuten: 60
        }
      : null
  );
  const [nichtGefunden, setNichtGefunden] = useState(false);

  useEffect(() => {
    if (!id) return;
    db.termine.get(id).then((t) => {
      if (!t || t.geloeschtAm) setNichtGefunden(true);
      else setForm(ausTermin(t));
    });
  }, [id]);

  if (nichtGefunden) {
    return (
      <>
        <Kopf titel="Termin" zurueck="/aufgaben/kalender" />
        <p className="leer">Diesen Termin gibt es nicht mehr. Vielleicht liegt er im Papierkorb.</p>
      </>
    );
  }
  if (!form) return <Kopf titel="Termin" zurueck="/aufgaben/kalender" />;

  const setzen = (a: Partial<Formular>) => setForm((f) => ({ ...f!, ...a }));

  async function speichern(e: FormEvent) {
    e.preventDefault();
    if (!form!.titel.trim() || !form!.datum) return;
    await terminSpeichern(zuTermin(form!), id);
    melden({ text: neu ? 'Termin gespeichert.' : 'Änderungen gespeichert.' });
    zurueck();
  }

  async function loeschen() {
    await terminLoeschen(id!);
    melden({ text: 'In den Papierkorb gelegt.', aktion: { text: 'Rückgängig', ausfuehren: () => terminWiederherstellen(id!) } });
    zurueck();
  }

  const t = zuTermin(form);

  return (
    <>
      <Kopf titel={neu ? 'Neuer Termin' : 'Termin bearbeiten'} zurueck="/aufgaben/kalender" />
      <form onSubmit={speichern}>
        <section className="karte">
          <label className="feld">
            <span>Was?</span>
            <input type="text" value={form.titel} onChange={(e) => setzen({ titel: e.target.value })} autoFocus={neu} required />
          </label>
          <label className="feld">
            <span>{form.ganztaegig ? 'Erster Tag' : 'Datum'}</span>
            <input type="date" value={form.datum} required onChange={(e) => setzen({ datum: e.target.value })} />
          </label>
          <Schalter text="Ganztägig" hilfe="z. B. Geburtstag oder Urlaub" an={form.ganztaegig} onChange={(g) => setzen({ ganztaegig: g })} />
          {form.ganztaegig ? (
            <label className="feld" style={{ marginTop: 8 }}>
              <span>Letzter Tag</span>
              <input type="date" value={form.letzterTag} min={form.datum} onChange={(e) => setzen({ letzterTag: e.target.value })} />
              <small>Nur bei mehreren Tagen ausfüllen.</small>
            </label>
          ) : (
            <div className="zwei-spalten" style={{ marginTop: 8 }}>
              <label className="feld">
                <span>Von</span>
                <input
                  type="time"
                  value={form.von}
                  required
                  onChange={(e) => {
                    const von = e.target.value;
                    // Ende mitschieben, damit die Dauer gleich bleibt
                    const alteDauer = form.bis && form.bis > form.von ? minutenAbstand(form.von, form.bis) : 60;
                    const bis = von ? uhrzeitTeil(minutenDazu(`2000-01-01T${von}`, alteDauer)) ?? '' : form.bis;
                    setzen({ von, bis: bis > von ? bis : '' });
                  }}
                />
              </label>
              <label className="feld">
                <span>Bis</span>
                <input type="time" value={form.bis} onChange={(e) => setzen({ bis: e.target.value })} />
              </label>
            </div>
          )}
          <label className="feld">
            <span>Ort</span>
            <input type="text" value={form.ort} onChange={(e) => setzen({ ort: e.target.value })} placeholder="optional" />
          </label>
        </section>

        <section className="karte">
          <WiederholungFeld wert={form.wiederholung} datum={form.datum} onChange={(w) => setzen({ wiederholung: w })} />
          <ErinnerungFeld wert={form.erinnerungMinuten} ohneUhrzeit={form.ganztaegig} onChange={(m) => setzen({ erinnerungMinuten: m })} />
        </section>

        <section className="karte">
          <label className="feld" style={{ marginBottom: 0 }}>
            <span>Notiz</span>
            <textarea value={form.notiz} onChange={(e) => setzen({ notiz: e.target.value })} />
          </label>
        </section>

        <button type="submit" className="knopf breit" style={{ marginBottom: 16 }} disabled={!form.titel.trim() || !form.datum}>
          Speichern
        </button>
      </form>

      {id && form.titel.trim() && form.datum && <KalenderExport eintrag={{ uid: id, ...t }} />}

      {!neu && (
        <button type="button" className="knopf zweitrangig breit" onClick={loeschen} style={{ color: 'var(--akzent)' }}>
          <Trash2 size={20} aria-hidden /> Termin löschen
        </button>
      )}
    </>
  );
}

function minutenAbstand(von: string, bis: string): number {
  const m = (u: string) => Number(u.slice(0, 2)) * 60 + Number(u.slice(3, 5));
  return m(bis) - m(von);
}
