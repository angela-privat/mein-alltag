import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CloudUpload, Download, Info } from 'lucide-react';
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

      <h2>Deine Bereiche</h2>
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
        <p>
          Das ist das Grundgerüst (Phase 2). Die einzelnen Bereiche werden Schritt für Schritt gefüllt. Hier auf „Heute“
          siehst du später deine Termine, Aufgaben, den Haushalt und das Essen des Tages.
        </p>
      </div>
    </>
  );
}
