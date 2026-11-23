import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { einstellungenLaden, STANDARD_EINSTELLUNGEN } from '../db/einstellungen';
import type { Einstellungen } from '../db/typen';

const Kontext = createContext<Einstellungen>(STANDARD_EINSTELLUNGEN);

/** Lädt die Einstellungen live aus der Datenbank und setzt Design + Schriftgröße. */
export function EinstellungenAnbieter({ children }: { children: ReactNode }) {
  const einstellungen = useLiveQuery(einstellungenLaden) ?? STANDARD_EINSTELLUNGEN;

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.design = einstellungen.design;
    html.dataset.schrift = einstellungen.schriftgroesse;
    const dunkel =
      einstellungen.design === 'dunkel' ||
      (einstellungen.design === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dunkel ? '#1c1a18' : '#2DBE5C');
  }, [einstellungen.design, einstellungen.schriftgroesse]);

  return <Kontext.Provider value={einstellungen}>{children}</Kontext.Provider>;
}

export function useEinstellungen(): Einstellungen {
  return useContext(Kontext);
}
