import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CloudUpload, FolderOpen, HardDrive, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Auswahl, Bestaetigen, Kopf, useMeldung } from '../../ui/bausteine';
import { useEinstellungen } from '../../app/einstellungenKontext';
import { einstellungenSpeichern } from '../../db/einstellungen';
import { TABELLEN_NAMEN } from '../../db/datenbank';
import {
  sicherungEinspielen, sicherungHerunterladen, sicherungPruefen, sicherungZusammenfassung,
  SicherungsFehler, type Sicherung
} from '../../db/sicherung';
import { dauerhaftenSpeicherAnfordern, speicherStatus, type SpeicherStatus } from '../../db/speicher';

const datumZeit = (iso: string) => format(new Date(iso), "d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de });

export function SicherungSeite() {
  const e = useEinstellungen();
  const melden = useMeldung();
  const dateiFeld = useRef<HTMLInputElement>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [geladen, setGeladen] = useState<Sicherung | null>(null);
  const [speicher, setSpeicher] = useState<SpeicherStatus | null>(null);

  useEffect(() => {
    speicherStatus().then(setSpeicher).catch(() => {});
  }, []);

  async function sichern() {
    setLaeuft(true);
    setFehler(null);
    try {
      const name = await sicherungHerunterladen();
      if (name) melden({ text: `Sicherung „${name}“ erstellt.` });
    } catch {
      setFehler('Die Sicherung konnte nicht erstellt werden. Bitte noch einmal versuchen.');
    } finally {
      setLaeuft(false);
    }
  }

  async function dateiGewaehlt(datei: File | undefined) {
    if (!datei) return;
    setFehler(null);
    try {
      setGeladen(sicherungPruefen(await datei.text()));
    } catch (f) {
      setFehler(f instanceof SicherungsFehler ? f.message : 'Die Datei konnte nicht gelesen werden.');
    } finally {
      if (dateiFeld.current) dateiFeld.current.value = '';
    }
  }

  async function einspielen() {
    if (!geladen) return;
    try {
      await sicherungEinspielen(geladen);
      melden({ text: 'Fertig: Deine Daten wurden wiederhergestellt.' });
    } catch {
      setFehler('Das Einspielen ist fehlgeschlagen. Deine bisherigen Daten sind unverändert.');
    } finally {
      setGeladen(null);
    }
  }

  async function speicherSchuetzen() {
    const ok = await dauerhaftenSpeicherAnfordern();
    setSpeicher(await speicherStatus());
    melden({
      text: ok ? 'Gut: Chrome behält deine Daten dauerhaft.' : 'Chrome hat das (noch) nicht erlaubt. Installiere die App, dann klappt es meist.'
    });
  }

  const inhalt = geladen ? sicherungZusammenfassung(geladen) : [];

  return (
    <>
      <Kopf
        titel="Sicherung"
        zurueck="/mehr"
        untertitel="Deine Daten liegen nur auf diesem Handy. Mit einer Sicherung kannst du sie wiederherstellen, z. B. auf einem neuen Handy."
      />

      {fehler && (
        <div className="hinweis fehler" role="alert">
          <TriangleAlert size={22} aria-hidden />
          <p>{fehler}</p>
        </div>
      )}

      <section className="karte">
        <div className="karte-kopf">
          <span className="karte-symbol">
            <CloudUpload size={20} aria-hidden />
          </span>
          <h2>Sicherung erstellen</h2>
        </div>
        <p>
          {e.letzteSicherungAm ? <>Letzte Sicherung: {datumZeit(e.letzteSicherungAm)}.</> : <>Noch keine Sicherung.</>}
        </p>
        <p className="leer">
          Tipp: Im Teilen-Menü auf <strong>„Drive“</strong> tippen, dann liegt die Sicherung sicher in deinem Google Drive.
        </p>
        <button className="knopf breit" onClick={sichern} disabled={laeuft}>
          {laeuft ? 'Wird erstellt …' : 'Sicherung erstellen'}
        </button>
      </section>

      <section className="karte">
        <Auswahl<string>
          beschriftung="An Sicherung erinnern"
          wert={String(e.sicherungErinnerungTage)}
          optionen={[
            { wert: '7', text: 'Jede Woche' },
            { wert: '14', text: 'Alle 2 Wochen' },
            { wert: '30', text: 'Monatlich' },
            { wert: '0', text: 'Nie' }
          ]}
          onChange={(w) => einstellungenSpeichern({ sicherungErinnerungTage: Number(w) })}
        />
      </section>

      <section className="karte">
        <div className="karte-kopf">
          <span className="karte-symbol" style={{ background: 'var(--m-haushalt)' }}>
            <FolderOpen size={20} aria-hidden />
          </span>
          <h2>Sicherung einspielen</h2>
        </div>
        <p className="leer">Wähle eine Datei, die mit „.mein-alltag.json“ endet. Du siehst vorher, was darin ist.</p>
        <input
          ref={dateiFeld}
          type="file"
          accept=".json,application/json"
          className="nur-vorleser"
          id="sicherung-datei"
          onChange={(ev) => dateiGewaehlt(ev.target.files?.[0])}
        />
        <label htmlFor="sicherung-datei" className="knopf zweitrangig breit" style={{ marginTop: 12 }}>
          Datei auswählen
        </label>
      </section>

      <section className="karte">
        <div className="karte-kopf">
          <span className="karte-symbol" style={{ background: 'var(--m-notizen)' }}>
            {speicher?.dauerhaft ? <ShieldCheck size={20} aria-hidden /> : <HardDrive size={20} aria-hidden />}
          </span>
          <h2>Speicher auf dem Handy</h2>
        </div>
        {speicher ? (
          <>
            <p>
              {speicher.dauerhaft
                ? 'Geschützt: Chrome löscht deine Daten nicht von selbst.'
                : 'Noch nicht geschützt: Bei sehr vollem Handy könnte Chrome Daten entfernen.'}
            </p>
            {speicher.belegtMB !== undefined && <p className="leer">Belegt: etwa {speicher.belegtMB} MB.</p>}
            {!speicher.dauerhaft && (
              <button className="knopf zweitrangig klein" onClick={speicherSchuetzen} style={{ marginTop: 8 }}>
                Speicher schützen
              </button>
            )}
          </>
        ) : (
          <p className="leer">Wird geprüft …</p>
        )}
      </section>

      <Bestaetigen
        offen={!!geladen}
        titel="Sicherung einspielen?"
        jaText="Ja, ersetzen"
        gefahr
        onJa={einspielen}
        onNein={() => setGeladen(null)}
      >
        {geladen && (
          <>
            <p>Sicherung vom {datumZeit(geladen.erstelltAm)}.</p>
            {inhalt.length ? (
              <ul>
                {inhalt.map((z) => (
                  <li key={z.tabelle}>
                    {TABELLEN_NAMEN[z.tabelle]}: {z.anzahl}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Die Sicherung enthält nur Einstellungen.</p>
            )}
            <p>
              <strong>Achtung:</strong> Alle jetzigen Daten in der App werden dabei ersetzt.
            </p>
          </>
        )}
      </Bestaetigen>
    </>
  );
}
