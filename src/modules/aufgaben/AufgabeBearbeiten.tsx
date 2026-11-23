import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Plus, Trash2, X } from 'lucide-react';
import { db } from '../../db/datenbank';
import { neueId } from '../../db/basis';
import type { Aufgabe } from '../../db/typen';
import { aufgabeLoeschen, aufgabeSpeichern, aufgabeWiederherstellen, type NeueAufgabe } from '../../db/aufgaben';
import { Auswahl, Kopf, useMeldung, useZurueck } from '../../ui/bausteine';
import { ErinnerungFeld, KalenderExport, WiederholungFeld } from './felder';

const LEER: NeueAufgabe = { titel: '', prioritaet: 'normal', unteraufgaben: [] };

export function AufgabeBearbeiten() {
  const { id } = useParams();
  const [suche] = useSearchParams();
  const zurueck = useZurueck('/aufgaben');
  const melden = useMeldung();
  const neu = !id;
  const [form, setForm] = useState<NeueAufgabe | null>(neu ? { ...LEER, faelligAm: suche.get('datum') ?? undefined } : null);
  const [original, setOriginal] = useState<Aufgabe | null>(null);
  const [nichtGefunden, setNichtGefunden] = useState(false);
  const [neuerTeil, setNeuerTeil] = useState('');

  useEffect(() => {
    if (!id) return;
    db.aufgaben.get(id).then((a) => {
      if (!a || a.geloeschtAm) {
        setNichtGefunden(true);
        return;
      }
      setOriginal(a);
      const { id: _i, erstelltAm: _e, geaendertAm: _g, geloeschtAm: _l, quelle: _q, ...rest } = a;
      setForm(rest);
    });
  }, [id]);

  if (nichtGefunden) {
    return (
      <>
        <Kopf titel="Aufgabe" zurueck="/aufgaben" />
        <p className="leer">Diese Aufgabe gibt es nicht mehr. Vielleicht liegt sie im Papierkorb.</p>
      </>
    );
  }
  if (!form) return <Kopf titel="Aufgabe" zurueck="/aufgaben" />;

  const setzen = (aenderung: Partial<NeueAufgabe>) => setForm((f) => ({ ...f!, ...aenderung }));

  async function speichern(e: FormEvent) {
    e.preventDefault();
    if (!form!.titel.trim()) return;
    const daten = { ...form! };
    if (!daten.faelligAm) {
      daten.uhrzeit = undefined;
      daten.wiederholung = undefined;
      daten.erinnerungMinuten = undefined;
    }
    if (neuerTeil.trim()) daten.unteraufgaben = [...daten.unteraufgaben, { id: neueId(), titel: neuerTeil.trim(), erledigt: false }];
    await aufgabeSpeichern(daten, id);
    melden({ text: neu ? 'Aufgabe gespeichert.' : 'Änderungen gespeichert.' });
    zurueck();
  }

  async function loeschen() {
    await aufgabeLoeschen(id!);
    melden({ text: 'In den Papierkorb gelegt.', aktion: { text: 'Rückgängig', ausfuehren: () => aufgabeWiederherstellen(id!) } });
    zurueck();
  }

  function teilHinzufuegen() {
    if (!neuerTeil.trim()) return;
    setzen({ unteraufgaben: [...form!.unteraufgaben, { id: neueId(), titel: neuerTeil.trim(), erledigt: false }] });
    setNeuerTeil('');
  }

  return (
    <>
      <Kopf titel={neu ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'} zurueck="/aufgaben" />
      <form onSubmit={speichern}>
        <section className="karte">
          <label className="feld">
            <span>Was ist zu tun?</span>
            <input type="text" value={form.titel} onChange={(e) => setzen({ titel: e.target.value })} autoFocus={neu} required />
          </label>
          <div className="zwei-spalten">
            <label className="feld">
              <span>Fällig am</span>
              <input type="date" value={form.faelligAm ?? ''} onChange={(e) => setzen({ faelligAm: e.target.value || undefined })} />
            </label>
            <label className="feld">
              <span>Uhrzeit</span>
              <input
                type="time"
                value={form.uhrzeit ?? ''}
                disabled={!form.faelligAm}
                onChange={(e) => setzen({ uhrzeit: e.target.value || undefined })}
              />
            </label>
          </div>
          {!form.faelligAm && <p className="leer" style={{ marginTop: -8, marginBottom: 12, fontSize: '0.9rem' }}>Für Wiederholung und Erinnerung bitte ein Datum wählen.</p>}
          <Auswahl
            beschriftung="Wichtigkeit"
            wert={form.prioritaet}
            optionen={[
              { wert: 'niedrig', text: 'Niedrig' },
              { wert: 'normal', text: 'Normal' },
              { wert: 'hoch', text: 'Wichtig' }
            ]}
            onChange={(p) => setzen({ prioritaet: p })}
          />
        </section>

        {form.faelligAm && (
          <section className="karte">
            <WiederholungFeld wert={form.wiederholung} datum={form.faelligAm} onChange={(w) => setzen({ wiederholung: w })} />
            <ErinnerungFeld wert={form.erinnerungMinuten} ohneUhrzeit={!form.uhrzeit} onChange={(m) => setzen({ erinnerungMinuten: m })} />
          </section>
        )}

        <section className="karte">
          <h2>Unterpunkte</h2>
          {form.unteraufgaben.length > 0 && (
            <ul className="unteraufgaben">
              {form.unteraufgaben.map((u) => (
                <li key={u.id}>
                  <label className="schalter" style={{ flex: 1, minHeight: 48 }}>
                    <input
                      type="checkbox"
                      checked={u.erledigt}
                      style={{ position: 'static', opacity: 1, width: 22, height: 22 }}
                      onChange={(e) =>
                        setzen({ unteraufgaben: form.unteraufgaben.map((x) => (x.id === u.id ? { ...x, erledigt: e.target.checked } : x)) })
                      }
                    />
                    <span className={u.erledigt ? 'erledigt-text' : undefined} style={{ flex: 1 }}>
                      {u.titel}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="symbolknopf"
                    aria-label={`Unterpunkt „${u.titel}“ entfernen`}
                    onClick={() => setzen({ unteraufgaben: form.unteraufgaben.filter((x) => x.id !== u.id) })}
                  >
                    <X size={20} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="schnell">
            <input
              type="text"
              placeholder="Unterpunkt hinzufügen …"
              aria-label="Unterpunkt hinzufügen"
              value={neuerTeil}
              onChange={(e) => setNeuerTeil(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  teilHinzufuegen();
                }
              }}
            />
            <button type="button" className="knopf zweitrangig" aria-label="Unterpunkt hinzufügen" onClick={teilHinzufuegen}>
              <Plus size={22} aria-hidden />
            </button>
          </div>
        </section>

        <section className="karte">
          <label className="feld" style={{ marginBottom: 0 }}>
            <span>Notiz</span>
            <textarea value={form.notiz ?? ''} onChange={(e) => setzen({ notiz: e.target.value || undefined })} />
          </label>
        </section>

        <div className="knopfreihe" style={{ marginBottom: 16 }}>
          <button type="submit" className="knopf breit" disabled={!form.titel.trim()}>
            Speichern
          </button>
        </div>
      </form>

      {form.faelligAm && original && (
        <KalenderExport
          eintrag={{
            uid: original.id,
            titel: form.titel,
            beginn: form.uhrzeit ? `${form.faelligAm}T${form.uhrzeit}` : form.faelligAm,
            ganztaegig: !form.uhrzeit,
            notiz: form.notiz,
            wiederholung: form.wiederholung,
            erinnerungMinuten: form.erinnerungMinuten
          }}
        />
      )}

      {!neu && (
        <button type="button" className="knopf zweitrangig breit" onClick={loeschen} style={{ color: 'var(--akzent)' }}>
          <Trash2 size={20} aria-hidden /> Aufgabe löschen
        </button>
      )}
    </>
  );
}
