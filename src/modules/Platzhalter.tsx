import { Link } from 'react-router';
import { Kopf } from '../ui/bausteine';
import { modulInfo } from '../app/module';

/** Vorläufige Seite für Module, die in einer späteren Phase gebaut werden. */
export function Platzhalter({ modul }: { modul: string }) {
  const m = modulInfo(modul);
  return (
    <>
      <Kopf titel={m.name} />
      <div className="karte platzhalter" style={{ ['--modulfarbe' as string]: m.farbe }}>
        <span className="gross-symbol">
          <m.symbol size={44} aria-hidden />
        </span>
        <h2>Kommt bald</h2>
        <p>
          <span className="etikett">geplant für Phase {m.phase}</span>
        </p>
        <p>Das wird hier möglich sein:</p>
        <ul>
          {m.geplant.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <div>
          <Link to="/" className="knopf zweitrangig">
            Zurück zu „Heute“
          </Link>
        </div>
      </div>
    </>
  );
}
