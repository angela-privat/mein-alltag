import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Bestaetigen, Kopf, useMeldung } from '../../ui/bausteine';
import {
  endgueltigLoeschen, papierkorbLaden, papierkorbLeeren, PAPIERKORB_TAGE, wiederherstellen, type PapierkorbEintrag
} from '../../db/basis';
import { TABELLEN_NAMEN } from '../../db/datenbank';

export function PapierkorbSeite() {
  const eintraege = useLiveQuery(papierkorbLaden);
  const melden = useMeldung();
  const [leerenFragen, setLeerenFragen] = useState(false);
  const [loeschenFragen, setLoeschenFragen] = useState<PapierkorbEintrag | null>(null);

  return (
    <>
      <Kopf
        titel="Papierkorb"
        zurueck="/mehr"
        untertitel={`Gelöschtes bleibt ${PAPIERKORB_TAGE} Tage hier und kann zurückgeholt werden. Danach wird es automatisch entfernt.`}
      />

      {eintraege === undefined ? (
        <p className="leer">Wird geladen …</p>
      ) : eintraege.length === 0 ? (
        <div className="karte platzhalter">
          <span className="gross-symbol" style={{ background: 'var(--flaeche-2)', color: 'var(--text-leise)' }}>
            <Trash2 size={40} aria-hidden />
          </span>
          <h2>Der Papierkorb ist leer</h2>
        </div>
      ) : (
        <>
          <section className="karte">
            <ul className="liste">
              {eintraege.map((e) => (
                <li key={e.tabelle + e.id} className="zeile">
                  <span className="text">
                    {e.titel}
                    <small>
                      {TABELLEN_NAMEN[e.tabelle]} · gelöscht am {format(new Date(e.geloeschtAm), 'd. MMMM', { locale: de })}
                    </small>
                  </span>
                  <button
                    className="knopf zweitrangig klein"
                    aria-label={`„${e.titel}“ wiederherstellen`}
                    onClick={async () => {
                      await wiederherstellen(e.tabelle, e.id);
                      melden({ text: `„${e.titel}“ ist wieder da.` });
                    }}
                  >
                    <RotateCcw size={18} aria-hidden />
                  </button>
                  <button
                    className="knopf zweitrangig klein"
                    aria-label={`„${e.titel}“ endgültig löschen`}
                    onClick={() => setLoeschenFragen(e)}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <button className="knopf gefahr breit" onClick={() => setLeerenFragen(true)}>
            Papierkorb leeren
          </button>
        </>
      )}

      <Bestaetigen
        offen={leerenFragen}
        titel="Papierkorb leeren?"
        jaText="Endgültig löschen"
        gefahr
        onNein={() => setLeerenFragen(false)}
        onJa={async () => {
          setLeerenFragen(false);
          const anzahl = await papierkorbLeeren();
          melden({ text: `${anzahl} ${anzahl === 1 ? 'Eintrag' : 'Einträge'} endgültig gelöscht.` });
        }}
      >
        <p>Alle Einträge im Papierkorb werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden.</p>
      </Bestaetigen>

      <Bestaetigen
        offen={!!loeschenFragen}
        titel="Endgültig löschen?"
        jaText="Endgültig löschen"
        gefahr
        onNein={() => setLoeschenFragen(null)}
        onJa={async () => {
          const e = loeschenFragen!;
          setLoeschenFragen(null);
          await endgueltigLoeschen(e.tabelle, e.id);
          melden({ text: `„${e.titel}“ wurde endgültig gelöscht.` });
        }}
      >
        <p>„{loeschenFragen?.titel}“ wird endgültig gelöscht. Das kann nicht rückgängig gemacht werden.</p>
      </Bestaetigen>
    </>
  );
}
