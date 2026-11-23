import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

/* ===== Seitenkopf ===== */
export function Kopf({ titel, zurueck, untertitel }: { titel: string; zurueck?: string; untertitel?: string }) {
  return (
    <>
      <header className="kopf">
        {zurueck && (
          <Link to={zurueck} className="zurueck" aria-label="Zurück">
            <ChevronLeft size={28} aria-hidden />
          </Link>
        )}
        <h1>{titel}</h1>
      </header>
      {untertitel && <p className="untertitel">{untertitel}</p>}
    </>
  );
}

/* ===== Schalter (Ein/Aus) ===== */
export function Schalter(props: { text: string; hilfe?: string; an: boolean; onChange: (an: boolean) => void }) {
  return (
    <label className="schalter">
      <span className="text">
        {props.text}
        {props.hilfe && <small style={{ display: 'block', color: 'var(--text-leise)' }}>{props.hilfe}</small>}
      </span>
      <input type="checkbox" role="switch" checked={props.an} onChange={(e) => props.onChange(e.target.checked)} />
      <span className="bahn" aria-hidden />
    </label>
  );
}

/* ===== Auswahl (mehrere Knöpfe, einer aktiv) ===== */
export function Auswahl<T extends string>(props: {
  beschriftung: string;
  wert: T;
  optionen: { wert: T; text: string }[];
  onChange: (w: T) => void;
}) {
  return (
    <div className="feld" role="group" aria-label={props.beschriftung}>
      <span>{props.beschriftung}</span>
      <div className="auswahl">
        {props.optionen.map((o) => (
          <button key={o.wert} type="button" aria-pressed={o.wert === props.wert} onClick={() => props.onChange(o.wert)}>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===== Bestätigungsdialog ===== */
export function Bestaetigen(props: {
  offen: boolean;
  titel: string;
  children: ReactNode;
  jaText: string;
  gefahr?: boolean;
  onJa: () => void;
  onNein: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.offen && !d.open) d.showModal?.();
    if (!props.offen && d.open) d.close();
  }, [props.offen]);
  return (
    <dialog ref={ref} onCancel={props.onNein} aria-labelledby="dialog-titel">
      <h2 id="dialog-titel">{props.titel}</h2>
      {props.children}
      <div className="knopfreihe">
        <button className="knopf zweitrangig" onClick={props.onNein}>
          Abbrechen
        </button>
        <button className={`knopf${props.gefahr ? ' gefahr' : ''}`} onClick={props.onJa}>
          {props.jaText}
        </button>
      </div>
    </dialog>
  );
}

/* ===== Kurze Meldung unten (Toast), optional mit „Rückgängig“ ===== */
interface MeldungDaten {
  text: string;
  aktion?: { text: string; ausfuehren: () => void };
}
const MeldungKontext = createContext<(m: MeldungDaten) => void>(() => {});

export function MeldungAnbieter({ children }: { children: ReactNode }) {
  const [meldung, setMeldung] = useState<MeldungDaten | null>(null);
  const zeitgeber = useRef<number | undefined>(undefined);
  const zeigen = useCallback((m: MeldungDaten) => {
    window.clearTimeout(zeitgeber.current);
    setMeldung(m);
    zeitgeber.current = window.setTimeout(() => setMeldung(null), m.aktion ? 6000 : 3500);
  }, []);
  return (
    <MeldungKontext.Provider value={zeigen}>
      {children}
      <div aria-live="polite">
        {meldung && (
          <div className="meldung" role="status">
            <span>{meldung.text}</span>
            {meldung.aktion && (
              <button
                onClick={() => {
                  meldung.aktion!.ausfuehren();
                  setMeldung(null);
                }}
              >
                {meldung.aktion.text}
              </button>
            )}
          </div>
        )}
      </div>
    </MeldungKontext.Provider>
  );
}

export function useMeldung() {
  return useContext(MeldungKontext);
}
