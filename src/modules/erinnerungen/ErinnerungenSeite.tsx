import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, BellOff, CalendarCheck, CalendarDays, Check, ChevronRight, Clock, Info, Plus, Repeat } from 'lucide-react';
import { db } from '../../db/datenbank';
import type { Erinnerung } from '../../db/typen';
import { erinnerungErledigen, erinnerungVerschieben, istFaellig, istKommend } from '../../db/erinnerungen';
import { tageDazu, verbinden, zeitpunktLesbar, heute, zeitpunktText } from '../../lib/zeit';
import { wiederholungLesbar } from '../../lib/wiederholung';
import { erlaubnisAnfragen, useErlaubnis } from '../../app/benachrichtigung';
import { Kopf, useMeldung } from '../../ui/bausteine';

function zielVon(e: Erinnerung): string {
  if (e.bezug.typ === 'aufgabe' && e.bezug.id) return `/aufgaben/${e.bezug.id}`;
  if (e.bezug.typ === 'termin' && e.bezug.id) return `/aufgaben/termin/${e.bezug.id}`;
  return `/erinnerungen/${e.id}`;
}

function Herkunft({ e }: { e: Erinnerung }) {
  if (e.bezug.typ === 'aufgabe') return <span><CalendarCheck size={14} aria-hidden /> Aufgabe</span>;
  if (e.bezug.typ === 'termin') return <span><CalendarDays size={14} aria-hidden /> Termin{e.vorkommen ? ` ${zeitpunktLesbar(e.vorkommen)}` : ''}</span>;
  return null;
}

/** Eine fällige/verpasste Erinnerung mit Knöpfen (auch auf „Heute“ benutzt). */
export function FaelligeErinnerung({ e }: { e: Erinnerung }) {
  const melden = useMeldung();
  const morgenFrueh = () => {
    const ziel = verbinden(tageDazu(heute(), 1), '09:00');
    return Math.round((new Date(ziel).getTime() - Date.now()) / 60_000);
  };
  return (
    <div className="erinnerung-zeile">
      <Link to={zielVon(e)} className="zeile" style={{ minHeight: 0, padding: 0 }}>
        <span className="text">
          <strong>{e.text}</strong>
          <small className="merkmale">
            <span className="ueberfaellig">
              <Clock size={14} aria-hidden /> {zeitpunktLesbar(e.zeitpunkt)}
            </span>
            <Herkunft e={e} />
          </small>
        </span>
      </Link>
      <div className="knopfreihe">
        <button
          className="knopf klein"
          onClick={async () => {
            const naechstes = await erinnerungErledigen(e.id);
            melden({ text: naechstes ? `Erledigt. Nächstes Mal: ${zeitpunktLesbar(naechstes)}.` : 'Erledigt.' });
          }}
        >
          <Check size={18} aria-hidden /> Erledigt
        </button>
        <button
          className="knopf zweitrangig klein"
          onClick={async () => {
            await erinnerungVerschieben(e.id, 60);
            melden({ text: 'Ich erinnere dich in 1 Stunde wieder.' });
          }}
        >
          In 1 Stunde
        </button>
        <button
          className="knopf zweitrangig klein"
          onClick={async () => {
            await erinnerungVerschieben(e.id, morgenFrueh());
            melden({ text: 'Ich erinnere dich morgen um 9 Uhr wieder.' });
          }}
        >
          Morgen
        </button>
      </div>
    </div>
  );
}

export function ErinnerungenSeite() {
  const alle = useLiveQuery(() => db.erinnerungen.orderBy('zeitpunkt').toArray());
  const erlaubnis = useErlaubnis();
  const jetzt = new Date();
  const faellig = (alle ?? []).filter((e) => istFaellig(e, jetzt));
  const kommend = (alle ?? []).filter((e) => istKommend(e, jetzt));
  const erledigt = (alle ?? []).filter((e) => !e.geloeschtAm && e.status === 'erledigt').reverse();

  return (
    <>
      <Kopf titel="Erinnerungen" zurueck="/mehr" />

      {erlaubnis === 'offen' && (
        <div className="hinweis info">
          <Bell size={22} aria-hidden />
          <div>
            <p>
              <strong>Benachrichtigungen erlauben?</strong> Dann meldet sich das Handy, wenn eine Erinnerung fällig wird – solange
              „Mein Alltag“ geöffnet ist oder noch im Hintergrund läuft.
            </p>
            <button className="knopf klein" onClick={() => erlaubnisAnfragen()}>
              Erlauben
            </button>
          </div>
        </div>
      )}
      {erlaubnis === 'abgelehnt' && (
        <div className="hinweis">
          <BellOff size={22} aria-hidden />
          <p>
            Benachrichtigungen sind ausgeschaltet. Einschalten: Handy-<strong>Einstellungen</strong> → <strong>Apps</strong> →{' '}
            <strong>Mein Alltag</strong> → <strong>Benachrichtigungen</strong>.
          </p>
        </div>
      )}

      <div className="hinweis info">
        <Info size={22} aria-hidden />
        <p style={{ margin: 0 }}>
          <strong>Wichtig:</strong> Ist die App ganz geschlossen, kann sie dich nicht zuverlässig wecken. Was du in der Zeit
          verpasst, steht hier unter „Fällig“. Für ganz wichtige Termine: im Termin auf <strong>„In Handy-Kalender übernehmen“</strong>{' '}
          tippen – der Kalender erinnert immer.
        </p>
      </div>

      {alle === undefined ? (
        <p className="leer">Wird geladen …</p>
      ) : (
        <>
          <div className={`abschnitt${faellig.length ? ' warnung' : ''}`}>
            <h2>Fällig &amp; verpasst</h2>
            <span className="anzahl">{faellig.length}</span>
          </div>
          <section className={`karte${faellig.length ? ' verpasst' : ''}`} style={{ paddingTop: 4, paddingBottom: 4 }}>
            {faellig.length === 0 ? (
              <p className="leer" style={{ padding: '10px 0' }}>Nichts verpasst.</p>
            ) : (
              faellig.map((e) => <FaelligeErinnerung key={e.id} e={e} />)
            )}
          </section>

          <div className="abschnitt">
            <h2>Demnächst</h2>
            <span className="anzahl">{kommend.length}</span>
          </div>
          <section className="karte" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {kommend.length === 0 ? (
              <p className="leer" style={{ padding: '10px 0' }}>
                Keine Erinnerungen geplant. Lege unten eine an – oder wähle bei einer Aufgabe oder einem Termin „Erinnern“.
              </p>
            ) : (
              <ul className="liste">
                {kommend.map((e) => (
                  <li key={e.id}>
                    <Link to={zielVon(e)} className="zeile">
                      <Bell size={20} aria-hidden style={{ color: 'var(--m-erinnerungen)', flexShrink: 0 }} />
                      <span className="text">
                        {e.text}
                        <small className="merkmale">
                          <span>{zeitpunktLesbar(e.zeitpunkt)}</span>
                          {e.status === 'verschoben' && <span>(verschoben)</span>}
                          {e.wiederholung && (
                            <span>
                              <Repeat size={14} aria-hidden /> {wiederholungLesbar(e.wiederholung)}
                            </span>
                          )}
                          <Herkunft e={e} />
                        </small>
                      </span>
                      <ChevronRight className="pfeil" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {erledigt.length > 0 && (
            <details className="karte" style={{ marginTop: 20 }}>
              <summary>Erledigt ({erledigt.length})</summary>
              <ul className="liste">
                {erledigt.slice(0, 20).map((e) => (
                  <li key={e.id}>
                    <Link to={zielVon(e)} className="zeile">
                      <span className="text">
                        <span className="erledigt-text">{e.text}</span>
                        <small>{zeitpunktLesbar(e.zeitpunkt)}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <div className="platz-fuer-fab" />
      <Link to={`/erinnerungen/neu?zeit=${encodeURIComponent(zeitpunktText(new Date(Date.now() + 3_600_000)).slice(0, 14) + '00')}`} className="fab">
        <Plus size={24} aria-hidden /> Neue Erinnerung
      </Link>
    </>
  );
}
