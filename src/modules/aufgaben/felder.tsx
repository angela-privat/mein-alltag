import { NavLink } from 'react-router';
import { CalendarDays, CalendarPlus, ListChecks } from 'lucide-react';
import type { Wiederholung } from '../../db/typen';
import { VORLAUF_OPTIONEN } from '../../db/erinnerungen';
import { WOCHENTAGE_KURZ, wochentag } from '../../lib/zeit';
import { googleKalenderLink, icsDateiname, icsErstellen, icsHerunterladen, type KalenderEintrag } from '../../lib/ics';
import { useMeldung } from '../../ui/bausteine';

/** Umschalter oben: Liste | Kalender */
export function AufgabenReiter() {
  return (
    <nav className="reiter" aria-label="Ansicht">
      <NavLink to="/aufgaben" end>
        <ListChecks size={20} aria-hidden /> Aufgaben
      </NavLink>
      <NavLink to="/aufgaben/kalender">
        <CalendarDays size={20} aria-hidden /> Kalender
      </NavLink>
    </nav>
  );
}

const ARTEN: { wert: Wiederholung['art'] | ''; text: string }[] = [
  { wert: '', text: 'Nicht wiederholen' },
  { wert: 'taeglich', text: 'Täglich' },
  { wert: 'woechentlich', text: 'Wöchentlich' },
  { wert: 'monatlich', text: 'Monatlich' },
  { wert: 'jaehrlich', text: 'Jährlich' }
];
const EINHEIT: Record<Wiederholung['art'], string> = {
  taeglich: 'Tage', woechentlich: 'Wochen', monatlich: 'Monate', jaehrlich: 'Jahre'
};

/** Auswahl der Wiederholung (Art, Abstand, Wochentage, Ende). */
export function WiederholungFeld(props: {
  wert: Wiederholung | undefined;
  /** Startdatum, für den vorausgewählten Wochentag */
  datum?: string;
  onChange: (w: Wiederholung | undefined) => void;
}) {
  const w = props.wert;
  const setzen = (aenderung: Partial<Wiederholung>) => props.onChange({ ...(w ?? { art: 'taeglich', intervall: 1 }), ...aenderung });
  return (
    <>
      <label className="feld">
        <span>Wiederholen</span>
        <select
          value={w?.art ?? ''}
          onChange={(e) => {
            const art = e.target.value as Wiederholung['art'] | '';
            if (!art) return props.onChange(undefined);
            props.onChange({
              art,
              intervall: w?.intervall ?? 1,
              bis: w?.bis,
              wochentage: art === 'woechentlich' && props.datum ? [wochentag(props.datum)] : undefined
            });
          }}
        >
          {ARTEN.map((a) => (
            <option key={a.wert} value={a.wert}>
              {a.text}
            </option>
          ))}
        </select>
      </label>
      {w && (
        <>
          <div className="zwei-spalten">
            <label className="feld">
              <span>Alle wie viele {EINHEIT[w.art]}?</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={w.intervall}
                onChange={(e) => setzen({ intervall: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })}
              />
            </label>
            <label className="feld">
              <span>Endet am</span>
              <input type="date" value={w.bis ?? ''} onChange={(e) => setzen({ bis: e.target.value || undefined })} />
              <small>leer = nie</small>
            </label>
          </div>
          {w.art === 'woechentlich' && (
            <div className="feld" role="group" aria-label="An welchen Tagen?">
              <span>An welchen Tagen?</span>
              <div className="wochentage">
                {WOCHENTAGE_KURZ.map((name, i) => {
                  const tag = i + 1;
                  const an = w.wochentage?.includes(tag) ?? false;
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={an}
                      onClick={() => {
                        const neu = an ? (w.wochentage ?? []).filter((t) => t !== tag) : [...(w.wochentage ?? []), tag];
                        setzen({ wochentage: neu.length ? neu.sort() : undefined });
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** Auswahl „Erinnern: keine / zur Uhrzeit / 15 Min vorher …“ */
export function ErinnerungFeld(props: { wert: number | undefined; ohneUhrzeit?: boolean; onChange: (m: number | undefined) => void }) {
  return (
    <label className="feld">
      <span>Erinnern</span>
      <select
        value={props.wert === undefined ? '' : String(props.wert)}
        onChange={(e) => props.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      >
        <option value="">Nicht erinnern</option>
        {VORLAUF_OPTIONEN.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.wert === 0 && props.ohneUhrzeit ? 'Am Tag selbst (9 Uhr)' : o.text}
          </option>
        ))}
      </select>
      {props.ohneUhrzeit && props.wert !== undefined && <small>Ohne Uhrzeit wird um 9 Uhr gerechnet.</small>}
    </label>
  );
}

/** Knöpfe „In Handy-Kalender übernehmen“ (.ics) und „Google Kalender“. */
export function KalenderExport(props: { eintrag: KalenderEintrag; onExportiert?: () => void }) {
  const melden = useMeldung();
  return (
    <section className="karte">
      <h2>In den Handy-Kalender</h2>
      <p className="leer" style={{ marginBottom: 12 }}>
        Der Handy-Kalender erinnert dich zuverlässig – auch wenn „Mein Alltag“ geschlossen ist.
      </p>
      <div className="knopfreihe">
        <button
          type="button"
          className="knopf"
          onClick={() => {
            icsHerunterladen(icsErstellen([props.eintrag]), icsDateiname(props.eintrag.titel, props.eintrag.beginn));
            props.onExportiert?.();
            melden({ text: 'Kalenderdatei erstellt. Tippe in der Chrome-Meldung auf „Öffnen“ und wähle deinen Kalender.' });
          }}
        >
          <CalendarPlus size={20} aria-hidden /> In Handy-Kalender übernehmen
        </button>
        <a className="knopf zweitrangig" href={googleKalenderLink(props.eintrag)} target="_blank" rel="noopener noreferrer">
          In Google Kalender öffnen
        </a>
      </div>
      <p className="leer" style={{ marginTop: 10, fontSize: '0.85rem' }}>
        Hinweis: „Google Kalender öffnen“ schickt Titel und Zeit an Google. Die Datei bleibt dagegen auf deinem Handy.
      </p>
    </section>
  );
}
