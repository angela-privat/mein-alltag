import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, CloudUpload, Trash2 } from 'lucide-react';
import { Auswahl, Kopf, Schalter } from '../../ui/bausteine';
import { useEinstellungen } from '../../app/einstellungenKontext';
import { einstellungenSpeichern, MODULE } from '../../db/einstellungen';
import type { Design, Schriftgroesse } from '../../db/typen';

export function EinstellungenSeite() {
  const e = useEinstellungen();
  const [name, setName] = useState(e.name ?? '');

  useEffect(() => {
    setName(e.name ?? '');
  }, [e.name]);

  return (
    <>
      <Kopf titel="Einstellungen" zurueck="/mehr" />

      <section className="karte">
        <label className="feld">
          <span>Dein Name</span>
          <input
            type="text"
            value={name}
            autoComplete="given-name"
            placeholder="Dein Vorname"
            onChange={(ev) => setName(ev.target.value)}
            onBlur={() => einstellungenSpeichern({ name: name.trim() || undefined })}
          />
          <small>Für die Begrüßung auf „Heute“. Bleibt nur auf deinem Handy.</small>
        </label>

        <Auswahl<Design>
          beschriftung="Aussehen"
          wert={e.design}
          optionen={[
            { wert: 'hell', text: 'Hell' },
            { wert: 'dunkel', text: 'Dunkel' },
            { wert: 'system', text: 'Wie Handy' }
          ]}
          onChange={(design) => einstellungenSpeichern({ design })}
        />

        <Auswahl<Schriftgroesse>
          beschriftung="Schriftgröße"
          wert={e.schriftgroesse}
          optionen={[
            { wert: 'normal', text: 'Normal' },
            { wert: 'gross', text: 'Groß' },
            { wert: 'sehrGross', text: 'Sehr groß' }
          ]}
          onChange={(schriftgroesse) => einstellungenSpeichern({ schriftgroesse })}
        />
      </section>

      <section className="karte">
        <h2>Bereiche anzeigen</h2>
        <p className="leer">Was du nicht brauchst, kannst du ausblenden. Es wird nichts gelöscht.</p>
        {MODULE.map((m) => (
          <Schalter
            key={m.schluessel}
            text={m.name}
            an={e.module[m.schluessel] !== false}
            onChange={(an) => einstellungenSpeichern({ module: { ...e.module, [m.schluessel]: an } })}
          />
        ))}
      </section>

      <section className="karte">
        <ul className="liste">
          <li>
            <Link to="/sicherung" className="zeile">
              <CloudUpload aria-hidden />
              <span className="text">Sicherung</span>
              <ChevronRight className="pfeil" aria-hidden />
            </Link>
          </li>
          <li>
            <Link to="/papierkorb" className="zeile">
              <Trash2 aria-hidden />
              <span className="text">Papierkorb</span>
              <ChevronRight className="pfeil" aria-hidden />
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}
