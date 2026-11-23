import { useEffect } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router';
import { CalendarCheck, House, LayoutGrid, ShoppingBasket, Sun } from 'lucide-react';
import { EinstellungenAnbieter } from './einstellungenKontext';
import { UpdateHinweis } from './UpdateHinweis';
import { MeldungAnbieter } from '../ui/bausteine';
import { Heute } from '../modules/heute/Heute';
import { Mehr } from '../modules/mehr/Mehr';
import { Platzhalter } from '../modules/Platzhalter';
import { EinstellungenSeite } from '../modules/einstellungen/EinstellungenSeite';
import { SicherungSeite } from '../modules/einstellungen/SicherungSeite';
import { PapierkorbSeite } from '../modules/einstellungen/PapierkorbSeite';
import { UeberSeite } from '../modules/einstellungen/UeberSeite';
import { MODUL_INFOS } from './module';
import { ErinnerungsWaechter } from './ErinnerungsWaechter';
import { AufgabenSeite } from '../modules/aufgaben/AufgabenSeite';
import { AufgabeBearbeiten } from '../modules/aufgaben/AufgabeBearbeiten';
import { KalenderSeite } from '../modules/aufgaben/KalenderSeite';
import { TerminBearbeiten } from '../modules/aufgaben/TerminBearbeiten';
import { ErinnerungenSeite } from '../modules/erinnerungen/ErinnerungenSeite';
import { ErinnerungBearbeiten } from '../modules/erinnerungen/ErinnerungBearbeiten';

/** Module, die schon gebaut sind (alle anderen zeigen „Kommt bald“). */
const FERTIG = ['aufgaben', 'erinnerungen'];

const LEISTE = [
  { pfad: '/', text: 'Heute', symbol: Sun },
  { pfad: '/aufgaben', text: 'Aufgaben', symbol: CalendarCheck },
  { pfad: '/einkauf', text: 'Einkauf', symbol: ShoppingBasket },
  { pfad: '/haushalt', text: 'Haushalt', symbol: House },
  { pfad: '/mehr', text: 'Mehr', symbol: LayoutGrid }
];

/** Bei jedem Seitenwechsel nach oben scrollen. */
function NachOben() {
  const { pathname } = useLocation();
  // Wichtig: geschweifte Klammern – neuere Browser geben bei scrollTo ein Promise zurück,
  // das React sonst fälschlich als Aufräum-Funktion aufrufen würde.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <EinstellungenAnbieter>
      <MeldungAnbieter>
        <HashRouter>
          <NachOben />
          <ErinnerungsWaechter />
          <div className="app">
            <main className="inhalt">
              <Routes>
                <Route path="/" element={<Heute />} />
                <Route path="/aufgaben" element={<AufgabenSeite />} />
                <Route path="/aufgaben/neu" element={<AufgabeBearbeiten key="neu" />} />
                <Route path="/aufgaben/kalender" element={<KalenderSeite />} />
                <Route path="/aufgaben/termin/neu" element={<TerminBearbeiten key="neu" />} />
                <Route path="/aufgaben/termin/:id" element={<TerminBearbeiten />} />
                <Route path="/aufgaben/:id" element={<AufgabeBearbeiten />} />
                <Route path="/erinnerungen" element={<ErinnerungenSeite />} />
                <Route path="/erinnerungen/neu" element={<ErinnerungBearbeiten key="neu" />} />
                <Route path="/erinnerungen/:id" element={<ErinnerungBearbeiten />} />
                {MODUL_INFOS.filter((m) => !FERTIG.includes(m.schluessel)).map((m) => (
                  <Route key={m.schluessel} path={m.pfad} element={<Platzhalter modul={m.schluessel} />} />
                ))}
                <Route path="/mehr" element={<Mehr />} />
                <Route path="/einstellungen" element={<EinstellungenSeite />} />
                <Route path="/sicherung" element={<SicherungSeite />} />
                <Route path="/papierkorb" element={<PapierkorbSeite />} />
                <Route path="/ueber" element={<UeberSeite />} />
                <Route path="*" element={<Heute />} />
              </Routes>
            </main>
            <nav className="leiste" aria-label="Hauptmenü">
              {LEISTE.map(({ pfad, text, symbol: Symbol }) => (
                <NavLink key={pfad} to={pfad} end={pfad === '/'}>
                  <span className="symbol-huelle">
                    <Symbol size={24} aria-hidden />
                  </span>
                  {text}
                </NavLink>
              ))}
            </nav>
            <UpdateHinweis />
          </div>
        </HashRouter>
      </MeldungAnbieter>
    </EinstellungenAnbieter>
  );
}
