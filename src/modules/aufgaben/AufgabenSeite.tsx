import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Check, ListChecks, Plus, Repeat, RotateCcw } from 'lucide-react';
import { db } from '../../db/datenbank';
import type { Aufgabe } from '../../db/typen';
import {
  aufgabeErledigen, aufgabeSpeichern, aufgabenGruppieren, aufgabeWiederOeffnen, aufgabeZuruecksetzen
} from '../../db/aufgaben';
import { heute, tageDazu, tagLesbar } from '../../lib/zeit';
import { wiederholungLesbar } from '../../lib/wiederholung';
import { useMeldung } from '../../ui/bausteine';
import { AufgabenReiter } from './felder';

/** Eine Aufgabe als Zeile mit Abhak-Kreis. Wird auch auf „Heute“ benutzt. */
export function AufgabeZeile({ a, ohneDatum }: { a: Aufgabe; ohneDatum?: boolean }) {
  const melden = useMeldung();
  const erledigt = !!a.erledigtAm;
  const h = heute();
  const fertigeTeile = a.unteraufgaben.filter((u) => u.erledigt).length;

  async function umschalten() {
    if (erledigt) {
      await aufgabeWiederOeffnen(a.id);
      return;
    }
    const r = await aufgabeErledigen(a.id);
    navigator.vibrate?.(15);
    melden({
      text: r.naechsteFaelligkeit ? `Erledigt! Nächstes Mal: ${tagLesbar(r.naechsteFaelligkeit)}.` : `„${a.titel}“ erledigt.`,
      aktion: { text: 'Rückgängig', ausfuehren: () => aufgabeZuruecksetzen(r.vorher) }
    });
  }

  return (
    <li className="aufgabe">
      <button
        className={`abhaken${a.prioritaet === 'hoch' ? ' hoch' : ''}`}
        aria-pressed={erledigt}
        aria-label={erledigt ? `„${a.titel}“ wieder öffnen` : `„${a.titel}“ abhaken`}
        onClick={umschalten}
      >
        <span className="kreis">
          <Check size={18} strokeWidth={3} aria-hidden />
        </span>
      </button>
      <Link to={`/aufgaben/${a.id}`} className="zeile">
        <span className="text">
          <span className={erledigt ? 'erledigt-text' : undefined}>{a.titel}</span>
          <small className="merkmale">
            {a.prioritaet === 'hoch' && !erledigt && <span className="wichtig">Wichtig</span>}
            {a.faelligAm && !ohneDatum && (
              <span className={!erledigt && a.faelligAm < h ? 'ueberfaellig' : undefined}>
                {tagLesbar(a.faelligAm)}
                {a.uhrzeit ? `, ${a.uhrzeit}` : ''}
              </span>
            )}
            {a.faelligAm && ohneDatum && a.uhrzeit && <span>{a.uhrzeit} Uhr</span>}
            {a.wiederholung && (
              <span title={wiederholungLesbar(a.wiederholung)}>
                <Repeat size={14} aria-hidden />
                <span className="nur-vorleser">{wiederholungLesbar(a.wiederholung)}</span>
              </span>
            )}
            {a.erinnerungMinuten !== undefined && !erledigt && (
              <span>
                <Bell size={14} aria-hidden />
                <span className="nur-vorleser">mit Erinnerung</span>
              </span>
            )}
            {a.unteraufgaben.length > 0 && (
              <span>
                <ListChecks size={14} aria-hidden /> {fertigeTeile}/{a.unteraufgaben.length}
              </span>
            )}
          </small>
        </span>
      </Link>
    </li>
  );
}

function Gruppe({ titel, liste, warnung, ohneDatum }: { titel: string; liste: Aufgabe[]; warnung?: boolean; ohneDatum?: boolean }) {
  if (!liste.length) return null;
  return (
    <>
      <div className={`abschnitt${warnung ? ' warnung' : ''}`}>
        <h2>{titel}</h2>
        <span className="anzahl">{liste.length}</span>
      </div>
      <section className="karte" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <ul className="liste">
          {liste.map((a) => (
            <AufgabeZeile key={a.id} a={a} ohneDatum={ohneDatum} />
          ))}
        </ul>
      </section>
    </>
  );
}

type Wann = 'heute' | 'morgen' | 'ohne';

export function AufgabenSeite() {
  const alle = useLiveQuery(() => db.aufgaben.toArray());
  const melden = useMeldung();
  const [titel, setTitel] = useState('');
  const [wann, setWann] = useState<Wann>('heute');

  async function schnellHinzufuegen(e: FormEvent) {
    e.preventDefault();
    if (!titel.trim()) return;
    const h = heute();
    await aufgabeSpeichern({
      titel,
      prioritaet: 'normal',
      unteraufgaben: [],
      faelligAm: wann === 'heute' ? h : wann === 'morgen' ? tageDazu(h, 1) : undefined
    });
    setTitel('');
    melden({ text: 'Aufgabe hinzugefügt.' });
  }

  const g = alle ? aufgabenGruppieren(alle) : undefined;
  const offen = g ? g.ueberfaellig.length + g.heute.length + g.morgen.length + g.spaeter.length + g.ohneDatum.length : 0;

  return (
    <>
      <header className="kopf">
        <h1>Aufgaben</h1>
      </header>
      <AufgabenReiter />

      <form className="karte" onSubmit={schnellHinzufuegen}>
        <div className="schnell">
          <label className="nur-vorleser" htmlFor="schnell-titel">
            Neue Aufgabe
          </label>
          <input
            id="schnell-titel"
            type="text"
            placeholder="Neue Aufgabe …"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            enterKeyHint="done"
            autoComplete="off"
          />
          <button className="knopf" type="submit" aria-label="Aufgabe hinzufügen" disabled={!titel.trim()}>
            <Plus size={24} aria-hidden />
          </button>
        </div>
        <div className="chips" role="group" aria-label="Wann fällig?">
          {(
            [
              ['heute', 'Heute'],
              ['morgen', 'Morgen'],
              ['ohne', 'Ohne Datum']
            ] as [Wann, string][]
          ).map(([w, t]) => (
            <button key={w} type="button" aria-pressed={wann === w} onClick={() => setWann(w)}>
              {t}
            </button>
          ))}
        </div>
      </form>

      {g === undefined ? (
        <p className="leer">Wird geladen …</p>
      ) : offen === 0 && g.erledigt.length === 0 ? (
        <div className="karte platzhalter">
          <span className="gross-symbol" style={{ ['--modulfarbe' as string]: 'var(--m-aufgaben)' }}>
            <ListChecks size={40} aria-hidden />
          </span>
          <h2>Noch keine Aufgaben</h2>
          <p className="leer">
            Schreib oben, was zu tun ist, und tippe auf <strong>+</strong>. Für Datum, Wiederholung, Erinnerung und
            Unterpunkte tippe unten auf <strong>„Neue Aufgabe“</strong>.
          </p>
        </div>
      ) : (
        <>
          {offen === 0 && <p className="leer" style={{ margin: '16px 4px' }}>Alles erledigt. Gut gemacht!</p>}
          <Gruppe titel="Überfällig" liste={g.ueberfaellig} warnung />
          <Gruppe titel="Heute" liste={g.heute} ohneDatum />
          <Gruppe titel="Morgen" liste={g.morgen} ohneDatum />
          <Gruppe titel="Später" liste={g.spaeter} />
          <Gruppe titel="Ohne Datum" liste={g.ohneDatum} />
          {g.erledigt.length > 0 && (
            <details className="karte" style={{ marginTop: 20 }}>
              <summary>Erledigt ({g.erledigt.length})</summary>
              <ul className="liste">
                {g.erledigt.slice(0, 30).map((a) => (
                  <AufgabeZeile key={a.id} a={a} />
                ))}
              </ul>
              {g.erledigt.length > 30 && <p className="leer">… und {g.erledigt.length - 30} ältere.</p>}
              <p className="leer" style={{ fontSize: '0.85rem', marginTop: 8 }}>
                <RotateCcw size={14} aria-hidden /> Tippe auf den Haken, um eine Aufgabe wieder zu öffnen.
              </p>
            </details>
          )}
        </>
      )}

      <div className="platz-fuer-fab" />
      <Link to="/aufgaben/neu" className="fab">
        <Plus size={24} aria-hidden /> Neue Aufgabe
      </Link>
    </>
  );
}
