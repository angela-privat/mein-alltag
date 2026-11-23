import { Link } from 'react-router';
import { ChevronRight, CloudUpload, Info, Settings, Trash2 } from 'lucide-react';
import { Kopf } from '../../ui/bausteine';
import { MODUL_INFOS } from '../../app/module';
import { useEinstellungen } from '../../app/einstellungenKontext';

const IN_DER_LEISTE = ['aufgaben', 'einkauf', 'haushalt'];

export function Mehr() {
  const e = useEinstellungen();
  const weitere = MODUL_INFOS.filter((m) => !IN_DER_LEISTE.includes(m.schluessel) && e.module[m.schluessel] !== false);

  return (
    <>
      <Kopf titel="Mehr" />
      <section className="karte">
        <h2>Weitere Bereiche</h2>
        <ul className="liste">
          {weitere.map((m) => (
            <li key={m.schluessel}>
              <Link to={m.pfad} className="zeile" style={{ ['--modulfarbe' as string]: m.farbe }}>
                <span className="karte-symbol">
                  <m.symbol size={20} aria-hidden />
                </span>
                <span className="text">
                  {m.name}
                  <small>{m.kurz}</small>
                </span>
                <ChevronRight className="pfeil" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="karte">
        <h2>App</h2>
        <ul className="liste">
          {[
            { pfad: '/einstellungen', text: 'Einstellungen', klein: 'Name, Aussehen, Schriftgröße, Bereiche', symbol: Settings },
            { pfad: '/sicherung', text: 'Sicherung', klein: 'Daten sichern und wiederherstellen', symbol: CloudUpload },
            { pfad: '/papierkorb', text: 'Papierkorb', klein: 'Gelöschtes 30 Tage zurückholen', symbol: Trash2 },
            { pfad: '/ueber', text: 'Über die App', klein: 'Version, Datenschutz', symbol: Info }
          ].map(({ pfad, text, klein, symbol: Symbol }) => (
            <li key={pfad}>
              <Link to={pfad} className="zeile">
                <span className="karte-symbol" style={{ background: 'var(--flaeche-2)', color: 'var(--text)' }}>
                  <Symbol size={20} aria-hidden />
                </span>
                <span className="text">
                  {text}
                  <small>{klein}</small>
                </span>
                <ChevronRight className="pfeil" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
