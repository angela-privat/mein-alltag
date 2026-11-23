import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { BellRing, CalendarCheck, CloudUpload, Download, Info } from 'lucide-react';
import { db } from '../../db/datenbank';
import { aufgabenGruppieren } from '../../db/aufgaben';
import { termineImBereich } from '../../db/termine';
import { istFaellig } from '../../db/erinnerungen';
import { heute as heuteText } from '../../lib/zeit';
import { AufgabeZeile } from '../aufgaben/AufgabenSeite';
import { TerminZeile } from '../aufgaben/KalenderSeite';
import { FaelligeErinnerung } from '../erinnerungen/ErinnerungenSeite';
import { useEinstellungen } from '../../app/einstellungenKontext';
import { MODUL_INFOS } from '../../app/module';
import { installieren, istInstalliert, useInstallAngebot } from '../../app/installation';
import { sicherungFaellig } from '../../db/einstellungen';
import { dauerhaftenSpeicherAnfordern } from '../../db/speicher';

export function begruessung(stunde: number): string {
  if (stunde < 5) return 'Gute Nacht';
  if (stunde < 11) return 'Guten Morgen';
  if (stunde < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export function Heute() {
  const e = useEinstellungen();
  const angebot = useInstallAngebot();
  const [jetzt] = useState(() => new Date());
  const [installiert] = useState(istInstalliert);

  // Chrome bitten, die Daten dauerhaft zu behalten (klappt meist nach der Installation).
  useEffect(() => {
    dauerhaftenSpeicherAnfordern().catch(() => {});
  }, []);

  const h = heuteText(jetzt);
  const alleTermine = useLiveQuery(() => db.termine.toArray());
  const alleAufgaben = useLiveQuery(() => db.aufgaben.toArray());
  const alleErinnerungen = useLiveQuery(() => db.erinnerungen.toArray());
  const aufgabenAn = e.module.aufgaben !== false;
  const erinnerungenAn = e.module.erinnerungen !== false;
  const termineHeute = aufgabenAn && alleTermine ? termineImBereich(alleTermine, h, h) : [];
  const g = alleAufgaben ? aufgabenGruppieren(alleAufgaben, jetzt) : undefined;
  const aufgabenHeute = aufgabenAn && g ? [...g.ueberfaellig, ...g.heute] : [];
  const verpasst = erinnerungenAn && alleErinnerungen ? alleErinnerungen.filter((x) => istFaellig(x, new Date())).sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt)) : [];

  const module = MODUL_INFOS.filter((m) => e.module[m.schluessel] !== false);
  const sicherungNoetig = sicherungFaellig(e, jetzt);

  return (
    <>
      <section className="begruessung">
        <p className="datum">{format(jetzt, 'EEEE, d. MMMM', { locale: de })}</p>
        <h1>
          {begruessung(jetzt.getHours())}
          {e.name ? `, ${e.name}` : ''}!
        </h1>
      </section>

      {!installiert && angebot && (
        <div className="hinweis info">
          <Download size={22} aria-hidden />
          <div>
            <p>
              <strong>Als App installieren?</strong> Dann startet „Mein Alltag“ wie eine normale App vom Startbildschirm –
              auch ohne Internet.
            </p>
            <button className="knopf klein" onClick={() => installieren()}>
              App installieren
            </button>
          </div>
        </div>
      )}

      {sicherungNoetig && (
        <div className="hinweis">
          <CloudUpload size={22} aria-hidden />
          <div>
            <p>
              {e.letzteSicherungAm ? (
                <>
                  Deine letzte Sicherung ist vom{' '}
                  <strong>{format(new Date(e.letzteSicherungAm), 'd. MMMM', { locale: de })}</strong>. Zeit für eine neue?
                </>
              ) : (
                <>Du hast noch keine Sicherung gemacht. Eine Sicherung schützt deine Daten, falls das Handy verloren geht.</>
              )}
            </p>
            <Link to="/sicherung" className="knopf klein">
              Jetzt sichern
            </Link>
          </div>
        </div>
      )}

      {verpasst.length > 0 && (
        <section className="karte verpasst" style={{ ['--modulfarbe' as string]: 'var(--m-erinnerungen)' }}>
          <div className="karte-kopf">
            <span className="karte-symbol">
              <BellRing size={20} aria-hidden />
            </span>
            <h2>Erinnerungen ({verpasst.length})</h2>
          </div>
          {verpasst.slice(0, 3).map((x) => (
            <FaelligeErinnerung key={x.id} e={x} />
          ))}
          {verpasst.length > 3 && (
            <Link to="/erinnerungen" className="knopf zweitrangig klein" style={{ marginTop: 8 }}>
              Alle {verpasst.length} ansehen
            </Link>
          )}
        </section>
      )}

      {aufgabenAn && (
        <section className="karte" style={{ ['--modulfarbe' as string]: 'var(--m-aufgaben)' }}>
          <div className="karte-kopf">
            <span className="karte-symbol">
              <CalendarCheck size={20} aria-hidden />
            </span>
            <h2>Heute</h2>
          </div>
          {termineHeute.length === 0 && aufgabenHeute.length === 0 ? (
            <p className="leer">
              Heute steht nichts an. <Link to="/aufgaben">Aufgabe</Link> oder <Link to="/aufgaben/termin/neu">Termin</Link> anlegen?
            </p>
          ) : (
            <ul className="liste">
              {termineHeute.map((v) => (
                <TerminZeile key={v.termin.id} v={v} />
              ))}
              {aufgabenHeute.map((a) => (
                <AufgabeZeile key={a.id} a={a} ohneDatum={a.faelligAm === h} />
              ))}
            </ul>
          )}
        </section>
      )}

      <h2 style={{ marginTop: 20 }}>Deine Bereiche</h2>
      <div className="raster">
        {module.map((m) => (
          <Link
            key={m.schluessel}
            to={m.pfad}
            className="karte kachel"
            style={{ ['--modulfarbe' as string]: m.farbe }}
          >
            <span className="karte-symbol">
              <m.symbol size={20} aria-hidden />
            </span>
            <strong>{m.name}</strong>
            <small>{m.kurz}</small>
          </Link>
        ))}
      </div>

      <div className="hinweis info">
        <Info size={22} aria-hidden />
        <p style={{ margin: 0 }}>
          Aufgaben, Kalender und Erinnerungen sind fertig. Einkauf, Haushalt, Essen, Finanzen und Notizen folgen Schritt für
          Schritt.
        </p>
      </div>
    </>
  );
}
