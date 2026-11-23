import { Lock, WifiOff } from 'lucide-react';
import { Kopf } from '../../ui/bausteine';
import { version } from '../../../package.json';

export function UeberSeite() {
  return (
    <>
      <Kopf titel="Über die App" zurueck="/mehr" />
      <section className="karte">
        <div className="karte-kopf">
          <span className="karte-symbol">
            <Lock size={20} aria-hidden />
          </span>
          <h2>Deine Daten gehören dir</h2>
        </div>
        <p>
          Alles, was du einträgst, wird <strong>nur auf diesem Handy</strong> gespeichert. Es gibt kein Konto, keine Cloud und
          keine Werbung. Niemand außer dir sieht deine Daten.
        </p>
        <p className="leer">
          Darum ist eine regelmäßige Sicherung wichtig: Geht das Handy verloren oder wird Chrome zurückgesetzt, sind die
          Daten sonst weg.
        </p>
      </section>
      <section className="karte">
        <div className="karte-kopf">
          <span className="karte-symbol" style={{ background: 'var(--m-haushalt)' }}>
            <WifiOff size={20} aria-hidden />
          </span>
          <h2>Funktioniert ohne Internet</h2>
        </div>
        <p>
          Nach dem ersten Öffnen läuft die App auch offline. Internet braucht sie nur für Updates. Wenn eine neue Version da
          ist, erscheint unten ein Hinweis mit dem Knopf <strong>„Neu laden“</strong>.
        </p>
      </section>
      <p className="version">Mein Alltag · Version {version} · Kosten: 0 €</p>
    </>
  );
}
