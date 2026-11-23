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
          <div className="app">
            <main className="inhalt">
              <Routes>
                <Route path="/" element={<Heute />} />
                {MODUL_INFOS.map((m) => (
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
