import { Link, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { Bell, ChevronLeft, ChevronRight, MapPin, Plus, Repeat } from 'lucide-react';
import { db } from '../../db/datenbank';
import type { Aufgabe } from '../../db/typen';
import { termineImBereich, zeitraumLesbar, type TerminVorkommen } from '../../db/termine';
import { datumText, heute, lesen, tageDazu, tagLesbar, WOCHENTAGE_KURZ, wochentag } from '../../lib/zeit';
import { Auswahl } from '../../ui/bausteine';
import { AufgabenReiter } from './felder';
import { AufgabeZeile } from './AufgabenSeite';

type Ansicht = 'monat' | 'woche' | 'tag';

/** Ein Termin-Vorkommen als Zeile (auch auf „Heute“ benutzt). */
export function TerminZeile({ v }: { v: TerminVorkommen }) {
  const t = v.termin;
  return (
    <li>
      <Link to={`/aufgaben/termin/${t.id}`} className="zeile" style={{ ['--modulfarbe' as string]: t.farbe ?? 'var(--m-erinnerungen)' }}>
        <span className="zeitspalte">{t.ganztaegig ? 'ganzt.' : v.beginn.slice(11, 16)}</span>
        <span className="text">
          {t.titel}
          <small className="merkmale">
            <span>{zeitraumLesbar(v)}</span>
            {t.ort && (
              <span>
                <MapPin size={14} aria-hidden /> {t.ort}
              </span>
            )}
            {t.wiederholung && (
              <span>
                <Repeat size={14} aria-hidden />
                <span className="nur-vorleser">wiederholt sich</span>
              </span>
            )}
            {t.erinnerungMinuten !== undefined && (
              <span>
                <Bell size={14} aria-hidden />
                <span className="nur-vorleser">mit Erinnerung</span>
              </span>
            )}
          </small>
        </span>
      </Link>
    </li>
  );
}

function TagInhalt({ tag, termine, aufgaben, leerText }: { tag: string; termine: TerminVorkommen[]; aufgaben: Aufgabe[]; leerText?: string }) {
  const t = termine.filter((v) => v.tag === tag);
  const a = aufgaben.filter((x) => x.faelligAm === tag);
  if (!t.length && !a.length) return leerText ? <p className="leer" style={{ padding: '8px 4px' }}>{leerText}</p> : null;
  return (
    <ul className="liste">
      {t.map((v) => (
        <TerminZeile key={v.termin.id + v.tag} v={v} />
      ))}
      {a.map((x) => (
        <AufgabeZeile key={x.id} a={x} ohneDatum />
      ))}
    </ul>
  );
}

export function KalenderSeite() {
  const [suche, setSuche] = useSearchParams();
  const h = heute();
  const ansicht = (suche.get('ansicht') as Ansicht) || 'monat';
  const datum = suche.get('datum') || h;
  const setzen = (neu: { ansicht?: Ansicht; datum?: string }) =>
    setSuche({ ansicht: neu.ansicht ?? ansicht, datum: neu.datum ?? datum }, { replace: true });

  // Sichtbarer Zeitraum
  let von: string, bis: string;
  if (ansicht === 'monat') {
    const erster = datumText(startOfMonth(lesen(datum)));
    von = tageDazu(erster, 1 - wochentag(erster));
    bis = tageDazu(von, 41);
  } else if (ansicht === 'woche') {
    von = tageDazu(datum, 1 - wochentag(datum));
    bis = tageDazu(von, 6);
  } else {
    von = bis = datum;
  }

  const termine = useLiveQuery(() => db.termine.toArray());
  const alleAufgaben = useLiveQuery(() => db.aufgaben.toArray());
  const vorkommen = termine ? termineImBereich(termine, von, bis) : [];
  const aufgaben = (alleAufgaben ?? []).filter((a) => !a.geloeschtAm && !a.erledigtAm && a.faelligAm && a.faelligAm >= von && a.faelligAm <= bis);

  function blaettern(richtung: 1 | -1) {
    if (ansicht === 'monat') setzen({ datum: datumText(startOfMonth(addMonths(lesen(datum), richtung))) });
    else setzen({ datum: tageDazu(datum, richtung * (ansicht === 'woche' ? 7 : 1)) });
  }

  const titel =
    ansicht === 'monat'
      ? format(lesen(datum), 'MMMM yyyy', { locale: de })
      : ansicht === 'woche'
        ? `${format(lesen(von), 'd. MMM', { locale: de })} – ${format(lesen(bis), 'd. MMM', { locale: de })}`
        : format(lesen(datum), 'EEEE, d. MMMM', { locale: de });

  const tage = Array.from({ length: Math.round((lesen(bis).getTime() - lesen(von).getTime()) / 86_400_000) + 1 }, (_, i) => tageDazu(von, i));
  const monatEnde = datumText(endOfMonth(lesen(datum)));
  const monatAnfang = datumText(startOfMonth(lesen(datum)));

  return (
    <>
      <header className="kopf">
        <h1>Kalender</h1>
      </header>
      <AufgabenReiter />

      <Auswahl
        beschriftung="Ansicht"
        wert={ansicht}
        optionen={[
          { wert: 'monat', text: 'Monat' },
          { wert: 'woche', text: 'Woche' },
          { wert: 'tag', text: 'Tag' }
        ]}
        onChange={(a) => setzen({ ansicht: a })}
      />

      <section className="karte">
        <div className="kal-leiste">
          <button className="symbolknopf" aria-label="Zurück" onClick={() => blaettern(-1)}>
            <ChevronLeft size={26} aria-hidden />
          </button>
          <h2 aria-live="polite">{titel}</h2>
          <button className="symbolknopf" aria-label="Weiter" onClick={() => blaettern(1)}>
            <ChevronRight size={26} aria-hidden />
          </button>
        </div>
        {datum !== h && (
          <div style={{ textAlign: 'center', marginTop: -6, marginBottom: 8 }}>
            <button className="knopf zweitrangig klein" onClick={() => setzen({ datum: h })}>
              Heute
            </button>
          </div>
        )}

        {ansicht === 'monat' && (
          <div className="monat">
            {WOCHENTAGE_KURZ.map((w) => (
              <span key={w} className="wt" aria-hidden>
                {w}
              </span>
            ))}
            {tage.map((tag) => {
              const anzT = vorkommen.filter((v) => v.tag === tag).length;
              const anzA = aufgaben.filter((a) => a.faelligAm === tag).length;
              const fremd = tag < monatAnfang || tag > monatEnde;
              const klassen = [fremd ? 'fremd' : '', tag === h ? 'heute' : ''].join(' ').trim();
              return (
                <button
                  key={tag}
                  className={klassen || undefined}
                  aria-pressed={tag === datum}
                  aria-label={`${tagLesbar(tag)}${anzT ? `, ${anzT} Termin${anzT > 1 ? 'e' : ''}` : ''}${anzA ? `, ${anzA} Aufgabe${anzA > 1 ? 'n' : ''}` : ''}`}
                  onClick={() => setzen({ datum: tag })}
                >
                  <span className="zahl">{Number(tag.slice(8))}</span>
                  <span className="punkte" aria-hidden>
                    {Array.from({ length: Math.min(anzT, 3) }, (_, i) => (
                      <i key={i} />
                    ))}
                    {anzA > 0 && <i className="aufg" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {ansicht === 'woche' &&
          tage.map((tag) => (
            <div key={tag}>
              <p className={`tagkopf${tag === h ? ' heute' : ''}`}>{format(lesen(tag), 'EEEE, d. MMMM', { locale: de })}</p>
              <TagInhalt tag={tag} termine={vorkommen} aufgaben={aufgaben} leerText="–" />
            </div>
          ))}

        {ansicht === 'tag' && <TagInhalt tag={datum} termine={vorkommen} aufgaben={aufgaben} leerText="Nichts geplant." />}
      </section>

      {ansicht === 'monat' && (
        <section className="karte">
          <h2>{format(lesen(datum), 'EEEE, d. MMMM', { locale: de })}</h2>
          <TagInhalt tag={datum} termine={vorkommen} aufgaben={aufgaben} leerText="Nichts geplant. Tippe unten auf „Neuer Termin“." />
        </section>
      )}

      <p className="leer" style={{ fontSize: '0.85rem', margin: '0 4px' }}>
        <span style={{ color: 'var(--m-erinnerungen)' }}>●</span> Termin &nbsp; <span style={{ color: 'var(--haupt)' }}>●</span> Aufgabe
      </p>

      <div className="platz-fuer-fab" />
      <Link to={`/aufgaben/termin/neu?datum=${datum}`} className="fab">
        <Plus size={24} aria-hidden /> Neuer Termin
      </Link>
    </>
  );
}
